import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ExpenseService } from '../../core/services/expense.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { Expense } from '../../core/models/expense.model';
import { Category } from '../../core/models/category.model';
import { PaymentMethod } from '../../core/models/payment-method.model';
import { BrlCentsPipe } from '../../shared/pipes/brl-cents.pipe';
import { categoryPath, flatCategoriesForSelect } from '../../shared/utils/category-path';
import { formatBrlFromCents } from '../../shared/utils/currency';
import { PaymentMethodType } from '../../core/models/payment-method-type';
import {
  ExpenseFormDialogComponent,
  ExpenseFormDialogData,
  ExpenseFormSubmitResult,
} from './expense-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';
import {
  MarkParcelPaidDialogComponent,
  MarkParcelPaidDialogData,
} from '../../shared/dialogs/mark-parcel-paid-dialog.component';
import {
  CancelExpenseDialogComponent,
  CancelExpenseDialogData,
} from '../../shared/dialogs/cancel-expense-dialog.component';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    BrlCentsPipe,
    DatePipe,
  ],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly expensesApi = inject(ExpenseService);
  private readonly categoriesApi = inject(CategoryService);
  private readonly paymentMethodsApi = inject(PaymentMethodService);
  private readonly usersApi = inject(UserService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly rows = signal<Expense[]>([]);
  protected categories: Category[] = [];
  protected paymentMethods: PaymentMethod[] = [];
  protected userNames = new Map<number, string>();
  protected categorySelect: { id: string; label: string }[] = [];

  readonly columns = [
    'date',
    'item',
    'type',
    'parcel',
    'payment',
    'amount',
    'status',
    'actions',
  ];

  readonly filterForm = this.fb.nonNullable.group({
    from: [null as Date | null],
    to: [null as Date | null],
    categoryId: [''],
    paymentMethodId: [''],
    responsible: [''],
    q: [''],
    hideCancelled: [true],
  });

  ngOnInit(): void {
    this.categoriesApi.list().subscribe((cats) => {
      this.categories = cats;
      this.categorySelect = flatCategoriesForSelect(cats);
    });
    this.paymentMethodsApi.list().subscribe((pms) => (this.paymentMethods = pms));
    this.usersApi.list().subscribe((users) => {
      this.userNames = new Map(users.map((u) => [u.id, u.name]));
    });

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.load());

    this.setDefaultMonthRange();
    this.load();
  }

  private setDefaultMonthRange(): void {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.filterForm.patchValue({ from, to }, { emitEvent: false });
  }

  private toIso(d: Date | null | undefined): string | undefined {
    if (!d) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  load(): void {
    this.loading.set(true);
    const f = this.filterForm.getRawValue();
    this.expensesApi
      .list({
        from: this.toIso(f.from ?? undefined),
        to: this.toIso(f.to ?? undefined),
        categoryId: f.categoryId || undefined,
        paymentMethodId: f.paymentMethodId || undefined,
        responsible: f.responsible?.trim() || undefined,
        q: f.q?.trim() || undefined,
        excludeCancelled: !!f.hideCancelled,
      })
      .subscribe({
        next: (list) => {
          this.rows.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notify.error('Não foi possível carregar os gastos.');
        },
      });
  }

  clearFilters(): void {
    this.filterForm.reset({
      q: '',
      responsible: '',
      categoryId: '',
      paymentMethodId: '',
      from: null,
      to: null,
      hideCancelled: true,
    });
    this.load();
  }

  categoryLabel(id: string): string {
    return categoryPath(this.categories, id);
  }

  /** Item principal + detalhe opcional. */
  itemPrimary(row: Expense): string {
    return this.categoryLabel(row.categoryId);
  }

  itemDetail(row: Expense): string {
    return (row.description ?? '').trim();
  }

  filterPaymentOptionLabel(pm: PaymentMethod): string {
    const resp = this.userNames.get(pm.responsibleUserId) ?? '—';
    return `${pm.label} — ${resp}`;
  }

  paymentLabel(id: string): string {
    const pm = this.paymentMethods.find((p) => p.id === id);
    if (!pm) return '—';
    const resp = this.userNames.get(pm.responsibleUserId) ?? '—';
    let s = `${pm.label} — ${resp}`;
    if (pm.type === PaymentMethodType.Pix && pm.pixKey) s += ` (${pm.pixKey})`;
    return s;
  }

  typeLabel(row: Expense): string {
    return row.kind === 'installment' ? 'Parcelado' : 'À vista';
  }

  parcelLabel(row: Expense): string {
    if (row.kind !== 'installment' || row.installmentIndex == null || row.installmentCount == null) {
      return '—';
    }
    return `Parcela ${row.installmentIndex} de ${row.installmentCount}`;
  }

  statusLabel(row: Expense): string {
    if (row.recordStatus === 'cancelled') return 'Cancelado';
    if (row.kind === 'single') return 'Pago';
    return row.paymentStatus === 'paid' ? 'Pago' : 'Pendente';
  }

  statusTooltip(row: Expense): string {
    if (row.recordStatus === 'cancelled' && row.cancellationNote) {
      return `Cancelado: ${row.cancellationNote}`;
    }
    if (row.kind === 'installment' && row.paymentStatus === 'paid' && row.paidObservation) {
      return `Obs.: ${row.paidObservation}`;
    }
    return '';
  }

  groupFullyPaid(row: Expense): boolean {
    if (row.kind !== 'installment' || !row.installmentGroupId || row.recordStatus === 'cancelled') {
      return false;
    }
    const g = this.rows().filter(
      (r) =>
        r.installmentGroupId === row.installmentGroupId &&
        r.recordStatus === 'active'
    );
    return g.length > 0 && g.every((r) => r.paymentStatus === 'paid');
  }

  isCancelled(row: Expense): boolean {
    return row.recordStatus === 'cancelled';
  }

  openCreate(): void {
    const ref = this.dialog.open<
      ExpenseFormDialogComponent,
      ExpenseFormDialogData,
      ExpenseFormSubmitResult | false
    >(ExpenseFormDialogComponent, { width: '560px', data: {} });
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      if (result.mode === 'installment') {
        this.expensesApi.createInstallment(result.data).subscribe({
          next: (rows) => {
            this.notify.success(`${rows.length} parcelas geradas. Elas aparecem ao filtrar cada mês.`);
            this.load();
          },
          error: () => this.notify.error('Erro ao criar parcelamento.'),
        });
      } else {
        this.expensesApi.createSingle(result.data).subscribe({
          next: () => {
            this.notify.success('Gasto registrado.');
            this.load();
          },
          error: () => this.notify.error('Erro ao salvar.'),
        });
      }
    });
  }


  openEdit(row: Expense): void {
    if (row.kind === 'installment' || row.recordStatus === 'cancelled') {
      return;
    }
    const ref = this.dialog.open<ExpenseFormDialogComponent, ExpenseFormDialogData, Expense | false>(
      ExpenseFormDialogComponent,
      { width: '560px', data: { expense: row } }
    );
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      const r = result as Expense;
      console.log('r: ', r);
      this.expensesApi
        .update(row.id, {
          description: r.description,
          amountCents: r.amountCents,
          personId: r.personId || null,
          date: r.date,
          categoryId: r.categoryId,
          paymentMethodId: r.paymentMethodId,
        })
        .subscribe({
          next: (updated) => {
            this.rows.update(rows => rows.map(r => r.id === row.id ? updated : r));
            this.notify.success('Gasto atualizado.');
            this.load();
          },
          error: () => this.notify.error('Erro ao atualizar.'),
        });
    });
  }

  openMarkParcelPaid(row: Expense): void {
    if (row.kind !== 'installment' || row.paymentStatus === 'paid' || row.recordStatus === 'cancelled') {
      return;
    }
    const ref = this.dialog.open<MarkParcelPaidDialogComponent, MarkParcelPaidDialogData, { observation: string } | null>(
      MarkParcelPaidDialogComponent,
      {
        width: '420px',
        data: {
          title: 'Marcar parcela como paga',
          summary: `${this.parcelLabel(row)} · ${formatBrlFromCents(row.amountCents)} · venc. ${row.date}`,
        },
      }
    );
    ref.afterClosed().subscribe((res) => {
      if (res == null) return;
      this.expensesApi
        .markParcelPaid(row.id, {
          paymentStatus: 'paid',
          observation: res.observation || undefined,
        })
        .subscribe({
          next: () => {
            this.notify.success('Parcela marcada como paga.');
            this.load();
          },
          error: () => this.notify.error('Não foi possível atualizar.'),
        });
    });
  }

  openMarkParcelUnpaid(row: Expense): void {
    if (row.kind !== 'installment' || row.paymentStatus === 'pending' || row.recordStatus === 'cancelled') {
      return;
    }
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Marcar parcela como não paga',
          message: `Deseja marcar a parcela ${this.parcelLabel(row)} como não paga?`,
          confirmLabel: 'Sim, marcar como não paga',
          cancelLabel: 'Cancelar',
        },
      }
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.expensesApi
        .markParcelPaid(row.id, {
          paymentStatus: 'pending',
        })
        .subscribe({
          next: () => {
            this.notify.success('Parcela marcada como não paga.');
            this.load();
          },
          error: () => this.notify.error('Não foi possível atualizar.'),
        });
    });
  }

  openCancelExpense(row: Expense): void {
    if (row.recordStatus === 'cancelled') return;
    const isInst = row.kind === 'installment' && row.installmentGroupId;
    const ref = this.dialog.open<CancelExpenseDialogComponent, CancelExpenseDialogData, { note: string } | null>(
      CancelExpenseDialogComponent,
      {
        width: '440px',
        data: {
          title: isInst ? 'Cancelar parcelamento' : 'Cancelar gasto',
          message: isInst
            ? `Serão canceladas todas as parcelas de “${this.itemPrimary(row)}” (${row.installmentCount} parcelas).`
            : `Cancelar o gasto “${this.itemPrimary(row)}”?`,
        },
      }
    );
    ref.afterClosed().subscribe((res) => {
      if (res == null) return;
      this.expensesApi.cancel(row.id, { note: res.note || undefined }).subscribe({
        next: () => {
          this.notify.success(isInst ? 'Parcelamento cancelado.' : 'Gasto cancelado.');
          this.load();
        },
        error: () => this.notify.error('Não foi possível cancelar.'),
      });
    });
  }

  confirmDelete(row: Expense): void {
    const isInst = row.kind === 'installment' && row.installmentGroupId;
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: isInst ? 'Excluir parcelamento' : 'Excluir gasto',
          message: isInst
            ? `Apagar definitivamente todas as parcelas de “${this.itemPrimary(row)}” (${row.installmentCount} parcelas)?`
            : `Apagar definitivamente “${this.itemPrimary(row)}”? Não confunde com cancelar.`,
          confirmLabel: 'Excluir',
        },
      }
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.expensesApi.delete(row.id).subscribe({
        next: () => {
          this.notify.success(isInst ? 'Parcelamento excluído.' : 'Gasto excluído.');
          this.load();
        },
        error: () => this.notify.error('Erro ao excluir.'),
      });
    });
  }

  openUncancelExpense(row: Expense): void {
    if (row.recordStatus !== 'cancelled') return;
    const isInst = row.kind === 'installment' && row.installmentGroupId;
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: isInst ? 'Descancelar parcelamento' : 'Descancelar gasto',
          message: isInst
            ? `Reativar todas as parcelas de "${this.itemPrimary(row)}" (${row.installmentCount} parcelas)?`
            : `Descancelar o gasto "${this.itemPrimary(row)}"?`,
          confirmLabel: 'Descancelar',
          cancelLabel: 'Manter cancelado',
        },
      }
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.expensesApi.uncancel(row.id).subscribe({
        next: () => {
          this.notify.success(isInst ? 'Parcelamento reativado.' : 'Gasto reativado.');
          this.load();
        },
        error: () => this.notify.error('Não foi possível descancelar.'),
      });
    });
  }
}
