import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CategoryCreateDto, CategoryUpdateDto } from '../models/category.model';
import {
  Expense,
  ExpenseCancelDto,
  ExpenseCreateInstallmentDto,
  ExpenseCreateSingleDto,
  ExpenseMarkPaidDto,
  ExpenseUncancelDto,
  ExpenseUpdateDto,
} from '../models/expense.model';
import { PaymentMethod, PaymentMethodCreateDto, PaymentMethodUpdateDto } from '../models/payment-method.model';
import { LoginRequest, UserCreateDto } from '../models/user.model';
import { Person, PersonCreateDto, PersonUpdateDto } from '../models/person.model';
import {
  loadState,
  makeToken,
  parseToken,
  saveState,
  seedIfEmpty,
  StoredUser,
  StoredPerson,
} from '../storage/local-api-store';
import { categoryIdsInSubtree, categoryPath } from '../../shared/utils/category-path';
import { addMonthsToIsoDate, splitTotalIntoParcelCents } from '../../shared/utils/installments';

function pathOnly(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url;
  }
}

function jsonBody<T>(body: unknown): T {
  return body as T;
}

function ok<T>(data: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body: data })).pipe(delay(120));
}

function err(status: number, message: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, statusText: message }));
}

function publicUser(u: StoredUser): Omit<StoredUser, 'password'> {
  const { password: _, ...rest } = u;
  return rest;
}

function isLeafCategory(categories: Category[], categoryId: string): boolean {
  return !categories.some((c) => c.parentId === categoryId);
}

export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes(environment.apiUrl)) {
    return next(req);
  }

  seedIfEmpty();
  let state = loadState();
  const path = pathOnly(req.url);
  const auth = parseToken(req.headers.get('Authorization'));

  const persist = () => saveState(state);

  // --- Auth (no token) ---
  if (req.method === 'POST' && path.endsWith('/auth/login')) {
    const body = jsonBody<LoginRequest>(req.body);
    const user = state.users.find((u) => u.email === body.email && u.password === body.password);
    if (!user) {
      return err(401, 'E-mail ou senha inválidos');
    }
    return ok({
      accessToken: makeToken(user.id),
      user: publicUser(user),
    });
  }

  if (req.method === 'GET' && path.endsWith('/auth/me')) {
    if (!auth) return err(401, 'Não autorizado');
    const user = state.users.find((u) => u.id === auth);
    if (!user) return err(401, 'Não autorizado');
    return ok(publicUser(user));
  }

  if (!auth) {
    return err(401, 'Não autorizado');
  }

  const authUser = state.users.find((u) => u.id === auth);
  if (!authUser) return err(401, 'Não autorizado');
  const userId = authUser.id;

  // --- Account members (usuários da mesma conta) ---
  const usersMatch = path.match(/^\/api\/users\/?$/);
  const userIdMatch = path.match(/^\/api\/users\/(\d+)\/?$/);

  if (usersMatch && req.method === 'GET') {
    const list = state.users
      .map((u) => publicUser(u))
      .sort((a, b) => a.name.localeCompare(b.name));
    return ok(list);
  }

  if (usersMatch && req.method === 'POST') {
    const dto = jsonBody<UserCreateDto>(req.body);
    const email = dto.email.trim().toLowerCase();
    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      return err(400, 'E-mail já cadastrado');
    }
    // Encontrar o próximo ID disponível (autoincremental)
    const maxId = state.users.length > 0 ? Math.max(...state.users.map(u => u.id)) : 0;
    const nextId = maxId + 1;
    const row: StoredUser = {
      id: nextId,
      email: dto.email.trim(),
      name: dto.name.trim(),
      password: dto.password,
    };
    state = { ...state, users: [...state.users, row] };
    persist();
    return ok(publicUser(row), 201);
  }

  if (userIdMatch && req.method === 'DELETE') {
    const id = parseInt(userIdMatch[1]);
    const target = state.users.find((u) => u.id === id);
    if (!target) return err(404, 'Usuário não encontrado');
    if (target.id === auth) {
      return err(400, 'Não é possível excluir o próprio usuário logado');
    }
    const used = state.paymentMethods.some(
      (p) => p.userId === id
    );
    if (used) {
      return err(400, 'Remova ou altere métodos de pagamento vinculados a este usuário');
    }
    state = { ...state, users: state.users.filter((u) => u.id !== id) };
    persist();
    return ok(null as unknown as null);
  }

  // --- Expenses (escopo = accountId) ---
  const expensePaymentMatch = path.match(/^\/api\/expenses\/([^/]+)\/payment\/?$/);
  const expenseCancelMatch = path.match(/^\/api\/expenses\/([^/]+)\/cancel\/?$/);
  const expenseMatch = path.match(/^\/api\/expenses\/?$/);
  const expenseIdMatch = path.match(/^\/api\/expenses\/([^/]+)\/?$/);

  if (expensePaymentMatch && req.method === 'PATCH') {
    const id = expensePaymentMatch[1];
    const idx = state.expenses.findIndex((e) => e.id === id && e.userId === userId);
    if (idx < 0) return err(404, 'Gasto não encontrado');
    const cur = state.expenses[idx];
    if (cur.recordStatus === 'cancelled') {
      return err(400, 'Gasto cancelado não pode alterar status de pagamento');
    }
    if (cur.kind !== 'installment') {
      return err(400, 'Apenas parcelas podem alterar status de pagamento assim');
    }
    const dto = jsonBody<ExpenseMarkPaidDto>(req.body);
    const today = new Date().toISOString().slice(0, 10);
    const obs = dto.observation?.trim() || null;
    const updated: Expense = {
      ...cur,
      paymentStatus: dto.paymentStatus,
      paidAt: dto.paymentStatus === 'paid' ? today : null,
      paidObservation: dto.paymentStatus === 'paid' ? obs : null,
    };
    const expenses = [...state.expenses];
    expenses[idx] = updated;
    state = { ...state, expenses };
    persist();
    return ok(updated);
  }

  if (expenseCancelMatch && req.method === 'PATCH') {
    const id = expenseCancelMatch[1];
    const exp = state.expenses.find((e) => e.id === id && e.userId === userId);
    if (!exp) return err(404, 'Gasto não encontrado');
    if (exp.recordStatus === 'cancelled') {
      return ok(exp);
    }
    const dto = jsonBody<ExpenseCancelDto>(req.body);
    const today = new Date().toISOString().slice(0, 10);
    const note = dto.note?.trim() || null;
    const idsToCancel = new Set<string>();
    if (exp.kind === 'installment' && exp.installmentGroupId) {
      const gid = exp.installmentGroupId;
      state.expenses
        .filter((e) => e.userId === userId && e.installmentGroupId === gid)
        .forEach((e) => idsToCancel.add(e.id));
    } else {
      idsToCancel.add(id);
    }
    const expenses = state.expenses.map((e) => {
      if (!idsToCancel.has(e.id)) return e;
      return {
        ...e,
        recordStatus: 'cancelled' as const,
        cancelledAt: today,
        cancellationNote: note,
      };
    });
    state = { ...state, expenses };
    persist();
    const updated = expenses.find((e) => e.id === id);
    return ok(updated!);
  }

  if (expenseMatch && req.method === 'GET') {
    let list = state.expenses.filter((e) => e.userId === userId);
    const params = req.params;
    const excludeCancelled = params.get('excludeCancelled') === 'true' || params.get('excludeCancelled') === '1';
    const from = params.get('from') ?? undefined;
    const to = params.get('to') ?? undefined;
    const categoryId = params.get('categoryId') ?? undefined;
    const paymentMethodId = params.get('paymentMethodId') ?? undefined;
    const personId = params.get('personId') ?? undefined;
    const responsible = params.get('responsible')?.toLowerCase().trim();
    const q = params.get('q')?.toLowerCase().trim();

    if (from) list = list.filter((e) => e.date >= from);
    if (to) list = list.filter((e) => e.date <= to);
    if (categoryId) {
      const cats = state.categories.filter((c) => c.userId === userId);
      const allowed = categoryIdsInSubtree(cats, categoryId);
      list = list.filter((e) => allowed.has(e.categoryId));
    }
    if (paymentMethodId) list = list.filter((e) => e.paymentMethodId === paymentMethodId);
    if (personId) list = list.filter((e) => e.personId === personId);
    if (q) {
      const cats = state.categories.filter((c) => c.userId === userId);
      list = list.filter((e) => {
        if (e.description.toLowerCase().includes(q)) return true;
        return categoryPath(cats, e.categoryId).toLowerCase().includes(q);
      });
    }
    if (responsible) {
      const memberIds = new Set(
        state.users
          .filter(
            (u) =>
              (u.name.toLowerCase().includes(responsible) || u.email.toLowerCase().includes(responsible))
          )
          .map((u) => u.id)
      );
      const pmIds = new Set(
        state.paymentMethods
          .filter((p) => p.userId === userId && memberIds.has(p.responsibleUserId))
          .map((p) => p.id)
      );
      list = list.filter((e) => pmIds.has(e.paymentMethodId));
    }
    if (excludeCancelled) {
      list = list.filter((e) => e.recordStatus !== 'cancelled');
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return ok(list);
  }

  if (expenseMatch && req.method === 'POST') {
    const raw = jsonBody<Record<string, unknown>>(req.body);
    const isInstallment =
      raw['kind'] === 'installment' ||
      (raw['totalAmountCents'] != null && raw['installmentCount'] != null);

    if (isInstallment) {
      const dto = raw as unknown as ExpenseCreateInstallmentDto;
      const n = Number(dto.installmentCount);
      const total = Number(dto.totalAmountCents);
      if (!dto.firstDueDate || !dto.categoryId || !dto.paymentMethodId) {
        return err(400, 'Preencha categoria, método e datas do parcelamento');
      }
      const cats = state.categories.filter((c) => c.userId === userId);
      if (!isLeafCategory(cats, dto.categoryId)) {
        return err(400, 'Categoria inválida — selecione um item, não um grupo');
      }
      if (!Number.isFinite(n) || n < 2) {
        return err(400, 'Informe pelo menos 2 parcelas');
      }
      if (!Number.isFinite(total) || total <= 0) {
        return err(400, 'Valor total inválido');
      }
      const amounts = splitTotalIntoParcelCents(Math.round(total), n);
      const groupId = crypto.randomUUID();
      const desc = dto.description != null ? String(dto.description).trim() : '';
      const rows: Expense[] = amounts.map((amountCents, i) => ({
        id: crypto.randomUUID(),
        userId: userId,
        description: desc,
        amountCents,
        date: addMonthsToIsoDate(dto.firstDueDate, i),
        categoryId: dto.categoryId,
        paymentMethodId: dto.paymentMethodId,
        personId: dto.personId || null,
        kind: 'installment',
        installmentGroupId: groupId,
        installmentIndex: i + 1,
        installmentCount: n,
        paymentStatus: 'pending',
        paidAt: null,
        paidObservation: null,
        recordStatus: 'active',
        cancelledAt: null,
        cancellationNote: null,
      }));
      state = { ...state, expenses: [...state.expenses, ...rows] };
      persist();
      return ok(rows, 201);
    }

    const dto = raw as unknown as ExpenseCreateSingleDto;
    if (dto.amountCents == null || !dto.date || !dto.categoryId || !dto.paymentMethodId) {
      return err(400, 'Preencha categoria, valor, data e método de pagamento');
    }
    const cats = state.categories.filter((c) => c.userId === userId);
    if (!isLeafCategory(cats, dto.categoryId)) {
      return err(400, 'Categoria inválida — selecione um item, não um grupo');
    }
    const desc = dto.description != null ? String(dto.description).trim() : '';
    const row: Expense = {
      id: crypto.randomUUID(),
      userId: userId,
      description: desc,
      amountCents: Math.round(Number(dto.amountCents)),
      date: dto.date,
      categoryId: dto.categoryId,
      paymentMethodId: dto.paymentMethodId,
      personId: dto.personId || null,
      kind: 'single',
      installmentGroupId: null,
      installmentIndex: null,
      installmentCount: null,
      paymentStatus: 'paid',
      paidAt: dto.date,
      paidObservation: null,
      recordStatus: 'active',
      cancelledAt: null,
      cancellationNote: null,
    };
    state = { ...state, expenses: [...state.expenses, row] };
    persist();
    return ok(row, 201);
  }

  if (expenseIdMatch && req.method === 'PUT') {
    const id = expenseIdMatch[1];
    const dto = jsonBody<ExpenseUpdateDto>(req.body);
    const idx = state.expenses.findIndex((e) => e.id === id && e.userId === userId);
    if (idx < 0) return err(404, 'Gasto não encontrado');
    const cur = state.expenses[idx];
    if (cur.recordStatus === 'cancelled') {
      return err(400, 'Gasto cancelado não pode ser editado');
    }
    const cats = state.categories.filter((c) => c.userId === userId);
    if (!isLeafCategory(cats, dto.categoryId)) {
      return err(400, 'Categoria inválida — selecione um item, não um grupo');
    }

    if (cur.kind === 'installment') {
      // Para parcelas, só permitimos alterar paymentStatus, description, categoryId, paymentMethodId, personId
      // Não permitimos alterar amountCents e date pois isso afetaria todo o parcelamento
      const updated: Expense = {
        ...cur,
        description: (dto.description ?? '').trim(),
        categoryId: dto.categoryId,
        paymentMethodId: dto.paymentMethodId,
        personId: dto.personId ?? cur.personId ?? null,
        paymentStatus: dto.paymentStatus ?? cur.paymentStatus,
        paidAt: dto.paymentStatus === 'paid' ? (cur.paidAt || new Date().toISOString().slice(0, 10)) : (dto.paymentStatus === 'pending' ? null : cur.paidAt),
        paidObservation: dto.paymentStatus === 'pending' ? null : cur.paidObservation,
      };
      const expenses = [...state.expenses];
      expenses[idx] = updated;
      state = { ...state, expenses };
      persist();
      return ok(updated);
    } else {
      // Para gastos únicos, permite alterar tudo
      const updated: Expense = {
        ...cur,
        description: (dto.description ?? '').trim(),
        amountCents: dto.amountCents,
        date: dto.date,
        categoryId: dto.categoryId,
        paymentMethodId: dto.paymentMethodId,
        personId: dto.personId ?? cur.personId ?? null,
      };
      const expenses = [...state.expenses];
      expenses[idx] = updated;
      state = { ...state, expenses };
      persist();
      return ok(updated);
    }
  }

  if (expenseIdMatch && req.method === 'DELETE') {
    const id = expenseIdMatch[1];
    const exp = state.expenses.find((e) => e.id === id && e.userId === userId);
    if (!exp) return err(404, 'Gasto não encontrado');
    if (exp.kind === 'installment' && exp.installmentGroupId) {
      const gid = exp.installmentGroupId;
      state = {
        ...state,
        expenses: state.expenses.filter(
          (e) => !(e.userId === userId && e.installmentGroupId === gid)
        ),
      };
    } else {
      state = { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
    }
    persist();
    return ok(null as unknown as null);
  }

  // --- Categories ---
  const catMatch = path.match(/^\/api\/categories\/?$/);
  const catIdMatch = path.match(/^\/api\/categories\/([^/]+)\/?$/);

  if (catMatch && req.method === 'GET') {
    const list = state.categories
      .filter((c) => c.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return ok(list);
  }

  if (catMatch && req.method === 'POST') {
    const dto = jsonBody<CategoryCreateDto>(req.body);
    if (dto.parentId) {
      const parent = state.categories.find((c) => c.id === dto.parentId && c.userId === userId);
      if (!parent) return err(400, 'Categoria pai inválida');
    }
    const row: Category = {
      id: crypto.randomUUID(),
      userId: userId,
      name: dto.name.trim(),
      parentId: dto.parentId,
    };
    state = { ...state, categories: [...state.categories, row] };
    persist();
    return ok(row, 201);
  }

  if (catIdMatch && req.method === 'PUT') {
    const id = catIdMatch[1];
    const dto = jsonBody<CategoryUpdateDto>(req.body);
    const idx = state.categories.findIndex((c) => c.id === id && c.userId === userId);
    if (idx < 0) return err(404, 'Categoria não encontrada');
    if (dto.parentId === id) return err(400, 'Categoria não pode ser pai de si mesma');
    if (dto.parentId) {
      const parent = state.categories.find((c) => c.id === dto.parentId && c.userId === userId);
      if (!parent) return err(400, 'Categoria pai inválida');
    }
    const updated: Category = { ...state.categories[idx], ...dto, name: dto.name.trim() };
    const categories = [...state.categories];
    categories[idx] = updated;
    state = { ...state, categories };
    persist();
    return ok(updated);
  }

  if (catIdMatch && req.method === 'DELETE') {
    const id = catIdMatch[1];
    const hasChildren = state.categories.some((c) => c.parentId === id);
    if (hasChildren) return err(400, 'Remova as subcategorias primeiro');
    const used = state.expenses.some((e) => e.categoryId === id && e.userId === userId);
    if (used) return err(400, 'Categoria em uso por gastos');
    const exists = state.categories.some((c) => c.id === id && c.userId === userId);
    if (!exists) return err(404, 'Categoria não encontrada');
    state = { ...state, categories: state.categories.filter((c) => c.id !== id) };
    persist();
    return ok(null as unknown as null);
  }

  // --- Payment methods ---
  const pmMatch = path.match(/^\/api\/payment-methods\/?$/);
  const pmIdMatch = path.match(/^\/api\/payment-methods\/([^/]+)\/?$/);

  const validResponsible = (rid: number): boolean => {
    return state.users.some((u) => u.id === rid);
  };

  if (pmMatch && req.method === 'GET') {
    const list = state.paymentMethods
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.label.localeCompare(b.label));
    return ok(list);
  }

  if (pmMatch && req.method === 'POST') {
    const dto = jsonBody<PaymentMethodCreateDto>(req.body);
    // Para criação, responsibleUserId é opcional - usa o usuário logado como padrão
    const responsibleId = dto.responsibleUserId || userId;
    if (!responsibleId || !validResponsible(responsibleId)) {
      return err(400, 'Responsável inválido');
    }
    const row: PaymentMethod = {
      id: crypto.randomUUID(),
      userId: userId,
      type: dto.type,
      label: dto.label.trim(),
      pixKey: dto.pixKey?.trim() || undefined,
      responsibleUserId: responsibleId,
      last4Digits: dto.last4Digits?.trim() || undefined,
      issuer: dto.issuer?.trim() || undefined,
    };
    state = { ...state, paymentMethods: [...state.paymentMethods, row] };
    persist();
    return ok(row, 201);
  }

  if (pmIdMatch && req.method === 'PUT') {
    const id = pmIdMatch[1];
    const dto = jsonBody<PaymentMethodUpdateDto>(req.body);
    if (!dto.responsibleUserId || !validResponsible(dto.responsibleUserId)) {
      return err(400, 'Responsável inválido');
    }
    const idx = state.paymentMethods.findIndex((p) => p.id === id && p.userId === userId);
    if (idx < 0) return err(404, 'Método não encontrado');
    const updated: PaymentMethod = {
      ...state.paymentMethods[idx],
      ...dto,
      label: dto.label.trim(),
      pixKey: dto.pixKey?.trim() || undefined,
      responsibleUserId: dto.responsibleUserId,
      last4Digits: dto.last4Digits?.trim() || undefined,
      issuer: dto.issuer?.trim() || undefined,
    };
    const paymentMethods = [...state.paymentMethods];
    paymentMethods[idx] = updated;
    state = { ...state, paymentMethods };
    persist();
    return ok(updated);
  }

  if (pmIdMatch && req.method === 'DELETE') {
    const id = pmIdMatch[1];
    const used = state.expenses.some((e) => e.paymentMethodId === id && e.userId === userId);
    if (used) return err(400, 'Método em uso por gastos');
    const exists = state.paymentMethods.some((p) => p.id === id && p.userId === userId);
    if (!exists) return err(404, 'Método não encontrado');
    state = { ...state, paymentMethods: state.paymentMethods.filter((p) => p.id !== id) };
    persist();
    return ok(null as unknown as null);
  }

  // --- People ---
  const peopleMatch = path.match(/^\/api\/people\/?$/);
  const personIdMatch = path.match(/^\/api\/people\/([^/]+)\/?$/);

  if (peopleMatch && req.method === 'GET') {
    const list = state.people
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name) || a.surname.localeCompare(b.surname));
    return ok(list);
  }

  if (peopleMatch && req.method === 'POST') {
    const dto = jsonBody<PersonCreateDto>(req.body);
    const row: StoredPerson = {
      id: crypto.randomUUID(),
      userId: userId,
      name: dto.name.trim(),
      surname: dto.surname.trim(),
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, people: [...state.people, row] };
    persist();
    return ok(row, 201);
  }

  if (personIdMatch && req.method === 'PUT') {
    const id = personIdMatch[1];
    const dto = jsonBody<PersonUpdateDto>(req.body);
    const idx = state.people.findIndex((p) => p.id === id && p.userId === userId);
    if (idx < 0) return err(404, 'Pessoa não encontrada');
    const updated: StoredPerson = {
      ...state.people[idx],
      name: dto.name.trim(),
      surname: dto.surname.trim(),
    };
    const people = [...state.people];
    people[idx] = updated;
    state = { ...state, people };
    persist();
    return ok(updated);
  }

  if (personIdMatch && req.method === 'DELETE') {
    const id = personIdMatch[1];
    const person = state.people.find((p) => p.id === id && p.userId === userId);
    if (!person) return err(404, 'Pessoa não encontrada');
    // Verificar se a pessoa está sendo usada em despesas
    const used = state.expenses.some((e) => e.personId === id && e.userId === userId);
    if (used) return err(400, 'Pessoa em uso por gastos');
    state = { ...state, people: state.people.filter((p) => p.id !== id) };
    persist();
    return ok(null as unknown as null);
  }

  return err(404, 'Endpoint não implementado no modo local');
};
