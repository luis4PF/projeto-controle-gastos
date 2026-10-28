import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { User } from '../../core/models/user.model';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private readonly usersApi = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly rows = signal<User[]>([]);
  readonly columns = ['name', 'email', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.usersApi.list().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Erro ao carregar usuários.');
      },
    });
  }

  openCreate(): void {
    const ref = this.dialog.open<
      UserFormDialogComponent,
      undefined,
      false | { name: string; email: string; password: string }
    >(UserFormDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.usersApi.create(result).subscribe({
        next: () => {
          this.notify.success('Usuário cadastrado. Ele já pode entrar com o e-mail e a senha definidos.');
          this.load();
        },
        error: (e: { status?: number; statusText?: string; error?: unknown }) => {
          const msg =
            (typeof e?.error === 'string' ? e.error : null) ??
            e?.statusText ??
            'Erro ao cadastrar.';
          this.notify.error(msg);
        },
      });
    });
  }

  isSelf(row: User): boolean {
    return row.id === this.auth.currentUser()?.id;
  }

  confirmDelete(row: User): void {
    if (this.isSelf(row)) return;
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Remover usuário',
          message: `Excluir o acesso de "${row.name}" (${row.email})? Os gastos existentes não são apagados.`,
        },
      }
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.usersApi.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Usuário removido.');
          this.load();
        },
        error: (e: { status?: number; statusText?: string }) => {
          this.notify.error(e?.statusText ?? 'Erro ao excluir.');
        },
      });
    });
  }
}
