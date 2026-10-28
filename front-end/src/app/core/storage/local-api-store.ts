import { Category } from '../models/category.model';
import { Expense } from '../models/expense.model';
import { PaymentMethod } from '../models/payment-method.model';
import { PaymentMethodType } from '../models/payment-method-type';
import { User } from '../models/user.model';
import { Person } from '../models/person.model';

const LS_KEY = 'controle_gastos_api_v1';

export interface StoredUser extends User {
  password: string;
}

export interface StoredPerson extends Person {}

export interface ApiState {
  users: StoredUser[];
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  people: StoredPerson[];
}

function emptyState(): ApiState {
  return { users: [], expenses: [], categories: [], paymentMethods: [], people: [] };
}

/** Migra dados antigos para o novo formato com IDs numéricos. */
function migrateState(state: ApiState): ApiState {
  // Para usuários existentes, converter IDs string para numéricos se necessário
  const users: StoredUser[] = state.users.map((u, index) => {
    const user = u as any;
    return {
      id: typeof user.id === 'number' ? user.id : (index + 1),
      email: user.email,
      name: user.name,
      password: user.password,
    };
  });

  // Migrar expenses, categories, paymentMethods e people para usar userId numérico
  const expenses: Expense[] = state.expenses.map((e) => {
    const ex = e as Expense & { kind?: string; paymentStatus?: string; recordStatus?: string };
    // Encontrar o userId numérico baseado no userId antigo
    const userIndex = state.users.findIndex(u => u.id === ex.userId);
    const newUserId = userIndex >= 0 ? (userIndex + 1) : 1;
    return {
      ...e,
      userId: newUserId,
      kind: (ex.kind === 'installment' ? 'installment' : 'single') as Expense['kind'],
      paymentStatus: (ex.paymentStatus === 'pending' ? 'pending' : 'paid') as Expense['paymentStatus'],
      installmentGroupId: ex.installmentGroupId ?? null,
      installmentIndex: ex.installmentIndex ?? null,
      installmentCount: ex.installmentCount ?? null,
      paidAt: ex.paidAt ?? (ex.paymentStatus !== 'pending' ? ex.date : null),
      paidObservation: ex.paidObservation ?? null,
      recordStatus: (ex.recordStatus === 'cancelled' ? 'cancelled' : 'active') as Expense['recordStatus'],
      cancelledAt: ex.cancelledAt ?? null,
      cancellationNote: ex.cancellationNote ?? null,
    };
  });

  const categories: Category[] = state.categories.map((c) => {
    const userIndex = state.users.findIndex(u => u.id === c.userId);
    const newUserId = userIndex >= 0 ? (userIndex + 1) : 1;
    return {
      ...c,
      userId: newUserId,
    };
  });

  const paymentMethods: PaymentMethod[] = state.paymentMethods.map((pm) => {
    const userIndex = state.users.findIndex(u => u.id === pm.userId);
    const newUserId = userIndex >= 0 ? (userIndex + 1) : 1;
    const responsibleIndex = state.users.findIndex(u => u.id === pm.responsibleUserId);
    const newResponsibleId = responsibleIndex >= 0 ? (responsibleIndex + 1) : newUserId;
    return {
      ...pm,
      userId: newUserId,
      responsibleUserId: newResponsibleId,
    };
  });

  const people: StoredPerson[] = (state.people ?? []).map((p) => {
    const userIndex = state.users.findIndex(u => u.id === p.userId);
    const newUserId = userIndex >= 0 ? (userIndex + 1) : 1;
    const creatorIndex = state.users.findIndex(u => u.id === p.createdByUserId);
    const newCreatorId = creatorIndex >= 0 ? (creatorIndex + 1) : newUserId;
    return {
      ...p,
      userId: newUserId,
      createdByUserId: newCreatorId,
    };
  });

  return { users, expenses, categories, paymentMethods, people };
}

export function loadState(): ApiState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as ApiState;
    return migrateState(parsed);
  } catch {
    return emptyState();
  }
}

export function saveState(state: ApiState): void {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function seedIfEmpty(): void {
  let state = loadState();
  if (state.users.length > 0) return;

  const luis: StoredUser = {
    id: 1,
    email: 'luis@gmail.com',
    name: 'Luis',
    password: '1234',
  };

  state = {
    users: [luis],
    categories: [],
    paymentMethods: [],
    people: [],
    expenses: [],
  };
  saveState(state);
}

export function parseToken(authorization: string | null | undefined): number | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice(7);
  if (token.startsWith('cg.')) {
    const idStr = token.slice(3);
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  }
  try {
    const payload = JSON.parse(atob(token)) as { sub?: string };
    const id = parseInt(payload.sub || '', 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

export function makeToken(userId: number): string {
  return `cg.${userId}`;
}
