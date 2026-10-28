import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentMethod } from '../../core/models/payment-method.model';
import { PAYMENT_METHOD_TYPE_LABELS } from '../../core/models/payment-method-type';
import {
  PaymentMethodFormDialogComponent,
  PaymentMethodFormDialogData,
} from './payment-method-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';

@Component({
  selector: 'app-payment-method-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payment-method-list.component.html',
  styleUrl: './payment-method-list.component.scss',
})
export class PaymentMethodListComponent implements OnInit {
  private readonly api = inject(PaymentMethodService);
  private readonly usersApi = inject(UserService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly rows = signal<PaymentMethod[]>([]);
  protected userNames = new Map<number, string>();
  readonly typeLabels = PAYMENT_METHOD_TYPE_LABELS;
  readonly columns = ['type', 'label', 'details', 'responsible', 'actions'];

  ngOnInit(): void {
    this.usersApi.list().subscribe((users) => {
      this.userNames = new Map(users.map((u) => [u.id, u.name]));
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Erro ao carregar métodos de pagamento.');
      },
    });
  }

  typeLabel(row: PaymentMethod): string {
    return this.typeLabels[row.type];
  }

  details(row: PaymentMethod): string {
    if (row.pixKey) return `PIX: ${row.pixKey}`;
    if (row.last4Digits) return `•••• ${row.last4Digits}${row.issuer ? ` — ${row.issuer}` : ''}`;
    return '—';
  }

  responsibleLabel(row: PaymentMethod): string {
    return this.userNames.get(row.responsibleUserId) ?? `ID ${row.responsibleUserId}`;
  }

  openCreate(): void {
    const ref = this.dialog.open<
      PaymentMethodFormDialogComponent,
      PaymentMethodFormDialogData,
      PaymentMethod | false
    >(PaymentMethodFormDialogComponent, { width: '480px', data: {} });
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.api
        .create({
          type: result.type,
          label: result.label,
          pixKey: result.pixKey,
          responsibleUserId: result.responsibleUserId,
          last4Digits: result.last4Digits,
          issuer: result.issuer,
        })
        .subscribe({
          next: () => {
            this.notify.success('Método cadastrado.');
            this.load();
          },
          error: () => this.notify.error('Erro ao salvar.'),
        });
    });
  }

  openEdit(row: PaymentMethod): void {
    const ref = this.dialog.open<
      PaymentMethodFormDialogComponent,
      PaymentMethodFormDialogData,
      PaymentMethod | false
    >(PaymentMethodFormDialogComponent, { width: '480px', data: { paymentMethod: row } });
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.api
        .update(row.id, {
          type: result.type,
          label: result.label,
          pixKey: result.pixKey,
          responsibleUserId: result.responsibleUserId,
          last4Digits: result.last4Digits,
          issuer: result.issuer,
        })
        .subscribe({
          next: () => {
            this.notify.success('Método atualizado.');
            this.load();
          },
          error: () => this.notify.error('Erro ao atualizar.'),
        });
    });
  }

  confirmDelete(row: PaymentMethod): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Excluir método',
          message: `Remover "${row.label}"?`,
        },
      }
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.api.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Método excluído.');
          this.load();
        },
        error: (e: { status?: number }) => {
          if (e?.status === 400) {
            this.notify.error('Método em uso por gastos cadastrados.');
          } else {
            this.notify.error('Erro ao excluir.');
          }
        },
      });
    });
  }
}
