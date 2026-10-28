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
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import { PaymentMethod } from '../../core/models/payment-method.model';
import { PaymentMethodType, PAYMENT_METHOD_TYPE_LABELS } from '../../core/models/payment-method-type';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

export interface PaymentMethodFormDialogData {
  paymentMethod?: PaymentMethod;
}

@Component({
  selector: 'app-payment-method-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './payment-method-form-dialog.component.html',
  styleUrl: './payment-method-form-dialog.component.scss',
})
export class PaymentMethodFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<PaymentMethodFormDialogComponent, PaymentMethod | false>
  );
  readonly data = inject<PaymentMethodFormDialogData>(MAT_DIALOG_DATA);
  private readonly usersApi = inject(UserService);
  private readonly auth = inject(AuthService);

  readonly typeLabels = PAYMENT_METHOD_TYPE_LABELS;
  readonly types = Object.values(PaymentMethodType);

  protected accountUsers: User[] = [];

  readonly form = this.fb.nonNullable.group({
    type: [PaymentMethodType.Pix as PaymentMethodType, Validators.required],
    label: ['', [Validators.required, Validators.maxLength(120)]],
    pixKey: [''],
    responsibleUserId: [0], // Mantém no form mas será oculto na criação
    last4Digits: [''],
    issuer: [''],
  });

  ngOnInit(): void {
    forkJoin({ users: this.usersApi.list() }).subscribe(({ users }) => {
      this.accountUsers = users;
      const pm = this.data.paymentMethod;
      const selfId = this.auth.currentUser()?.id;
      const defaultResp = pm?.responsibleUserId ?? selfId ?? users[0]?.id;
      this.form.patchValue({
        type: pm?.type ?? PaymentMethodType.Pix,
        label: pm?.label ?? '',
        pixKey: pm?.pixKey ?? '',
        responsibleUserId: defaultResp,
        last4Digits: pm?.last4Digits ?? '',
        issuer: pm?.issuer ?? '',
      });

      // Para edição, responsibleUserId é obrigatório; para criação, será preenchido automaticamente
      if (pm) {
        this.form.controls.responsibleUserId.setValidators([Validators.required]);
      } else {
        this.form.controls.responsibleUserId.clearValidators();
      }
      this.form.controls.responsibleUserId.updateValueAndValidity();
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    const type = this.form.controls.type.value;
    const pixKey = this.form.controls.pixKey.value.trim();
    if (type === PaymentMethodType.Pix && !pixKey) {
      this.form.controls.pixKey.setErrors({ required: true });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const base = {
      type: v.type,
      label: v.label.trim(),
      pixKey: type === PaymentMethodType.Pix ? pixKey : undefined,
      // Para criação, responsibleUserId será definido automaticamente no backend
      // Para edição, usa o valor do formulário
      ...(this.data.paymentMethod ? { responsibleUserId: v.responsibleUserId } : {}),
      last4Digits: v.last4Digits?.trim() || undefined,
      issuer: v.issuer?.trim() || undefined,
    };
    const pm = this.data.paymentMethod;
    if (pm) {
      this.dialogRef.close({ ...pm, ...base } as PaymentMethod);
    } else {
      this.dialogRef.close({
        id: '',
        userId: 0, // Será definido no backend
        ...base,
      } as PaymentMethod);
    }
  }

  protected isPix(): boolean {
    return this.form.controls.type.value === PaymentMethodType.Pix;
  }

  protected isCard(): boolean {
    const t = this.form.controls.type.value;
    return t === PaymentMethodType.DebitCard || t === PaymentMethodType.CreditCard;
  }

  protected userLabel(u: User): string {
    return `${u.name} (${u.email})`;
  }
}
