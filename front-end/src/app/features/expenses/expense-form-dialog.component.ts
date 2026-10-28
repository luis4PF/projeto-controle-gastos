import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { NgxMaskDirective } from 'ngx-mask';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { PersonService } from '../../core/services/person.service';
import { Expense, ExpenseCreateInstallmentDto, ExpenseCreateSingleDto, ExpensePaymentStatus } from '../../core/models/expense.model';
import { PaymentMethod } from '../../core/models/payment-method.model';
import { Person } from '../../core/models/person.model';
import { PaymentMethodType } from '../../core/models/payment-method-type';
import { flatCategoriesForSelect, leafCategoriesForSelect } from '../../shared/utils/category-path';
import { parseBrlStringToCents } from '../../shared/utils/currency';
import { forkJoin } from 'rxjs';

export interface ExpenseFormDialogData {
  expense?: Expense;
}

export type ExpenseFormSubmitResult =
  | { mode: 'single'; data: ExpenseCreateSingleDto }
  | { mode: 'installment'; data: ExpenseCreateInstallmentDto };

@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSelectModule,
    MatIconModule,
    MatRadioModule,
    NgxMaskDirective,
  ],
  templateUrl: './expense-form-dialog.component.html',
  styleUrl: './expense-form-dialog.component.scss',
})
export class ExpenseFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<ExpenseFormDialogComponent, Expense | ExpenseFormSubmitResult | false>
  );
  readonly data = inject<ExpenseFormDialogData>(MAT_DIALOG_DATA);
  private readonly categoriesApi = inject(CategoryService);
  private readonly paymentMethodsApi = inject(PaymentMethodService);
  private readonly usersApi = inject(UserService);
  private readonly peopleApi = inject(PersonService);

  protected categoryOptions: { id: string; label: string }[] = [];
  protected paymentMethods: PaymentMethod[] = [];
  protected people: Person[] = [];
  private userNames = new Map<number, string>();

  /** Criação: à vista vs parcelado. Edição só à vista. */
  protected expenseMode: 'single' | 'installment' = 'single';

  readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.maxLength(500)]],
    amountDisplay: [''],
    date: [new Date() as Date | null, Validators.required],
    categoryId: ['', Validators.required],
    paymentMethodId: ['', Validators.required],
    personId: [''],
    paymentStatus: ['pending' as ExpensePaymentStatus],
    totalAmountDisplay: [''],
    installmentCount: [2 as number, [Validators.required, Validators.min(2), Validators.max(360)]],
    firstDueDate: [null as Date | null],
  });

  ngOnInit(): void {
    forkJoin({
      cats: this.categoriesApi.list(),
      pms: this.paymentMethodsApi.list(),
      users: this.usersApi.list(),
      people: this.peopleApi.list(),
    }).subscribe(({ cats, pms, users, people }) => {
      this.categoryOptions = leafCategoriesForSelect(cats);
      this.paymentMethods = pms;
      this.people = people;
      this.userNames = new Map(users.map((u) => [u.id, u.name]));
      const exp = this.data.expense;
      if (exp) {
        const cents = exp.amountCents;
        const brl = (cents / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        this.form.patchValue({
          description: exp.description,
          amountDisplay: brl,
          date: new Date(exp.date + 'T12:00:00'),
          categoryId: exp.categoryId,
          paymentMethodId: exp.paymentMethodId,
          personId: exp.personId ?? '',
          paymentStatus: exp.paymentStatus,
        });
        this.form.controls.amountDisplay.setValidators([Validators.required]);
        this.form.controls.date.setValidators([Validators.required]);
      } else {
        this.applyModeValidators('single');
      }
    });
  }

  protected setExpenseMode(mode: 'single' | 'installment'): void {
    if (this.data.expense) return;
    this.expenseMode = mode;
    if (mode === 'installment' && this.form.controls.firstDueDate.value == null) {
      this.form.patchValue({ firstDueDate: new Date() });
    }
    this.applyModeValidators(mode);
  }

  private applyModeValidators(mode: 'single' | 'installment'): void {
    const amt = this.form.controls.amountDisplay;
    const total = this.form.controls.totalAmountDisplay;
    const fd = this.form.controls.firstDueDate;
    const ic = this.form.controls.installmentCount;
    if (mode === 'single') {
      amt.setValidators([Validators.required]);
      total.clearValidators();
      fd.clearValidators();
      ic.clearValidators();
    } else {
      amt.clearValidators();
      total.setValidators([Validators.required]);
      fd.setValidators([Validators.required]);
      ic.setValidators([Validators.required, Validators.min(2), Validators.max(360)]);
    }
    amt.updateValueAndValidity();
    total.updateValueAndValidity();
    fd.updateValueAndValidity();
    ic.updateValueAndValidity();
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    const exp = this.data.expense;
    if (exp) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      const v = this.form.getRawValue();
      const amountCents = parseBrlStringToCents(v.amountDisplay);
      if (amountCents == null || amountCents <= 0) {
        this.form.controls.amountDisplay.setErrors({ money: true });
        return;
      }
      const d = v.date;
      if (!d) return;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.dialogRef.close({
        ...exp,
        description: v.description.trim(),
        amountCents,
        date: iso,
        categoryId: v.categoryId,
        paymentMethodId: v.paymentMethodId,
        personId: v.personId || null,
        paymentStatus: v.paymentStatus,
      } as Expense);
      return;
    }

    if (this.expenseMode === 'single') {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      const v = this.form.getRawValue();
      const amountCents = parseBrlStringToCents(v.amountDisplay);
      if (amountCents == null || amountCents <= 0) {
        this.form.controls.amountDisplay.setErrors({ money: true });
        return;
      }
      const d = v.date;
      if (!d) return;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const data: ExpenseCreateSingleDto = {
        description: v.description.trim(),
        amountCents,
        date: iso,
        categoryId: v.categoryId,
        paymentMethodId: v.paymentMethodId,
        personId: v.personId || undefined,
      };
      this.dialogRef.close({ mode: 'single', data });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const totalCents = parseBrlStringToCents(v.totalAmountDisplay ?? '');
    if (totalCents == null || totalCents <= 0) {
      this.form.controls.totalAmountDisplay.setErrors({ money: true });
      return;
    }
    const fd = v.firstDueDate;
    if (!fd) return;
    const firstDue = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}-${String(fd.getDate()).padStart(2, '0')}`;
    const n = Math.round(Number(v.installmentCount));
    if (n < 2) {
      this.form.controls.installmentCount.setErrors({ min: true });
      return;
    }
    const data: ExpenseCreateInstallmentDto = {
      description: v.description.trim(),
      totalAmountCents: totalCents,
      installmentCount: n,
      firstDueDate: firstDue,
      categoryId: v.categoryId,
      paymentMethodId: v.paymentMethodId,
      personId: v.personId || undefined,
    };
    this.dialogRef.close({ mode: 'installment', data });
  }

  protected pmLabel(pm: PaymentMethod): string {
    const resp = this.userNames.get(pm.responsibleUserId) ?? '—';
    let s = `${pm.label} — ${resp}`;
    if (pm.type === PaymentMethodType.Pix && pm.pixKey) {
      s += ` (PIX ${pm.pixKey})`;
    }
    return s;
  }

  protected personFullName(person: Person): string {
    return `${person.name} ${person.surname}`.trim();
  }

  protected isEdit(): boolean {
    return !!this.data.expense;
  }
}
