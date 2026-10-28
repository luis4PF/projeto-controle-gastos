import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { PersonService } from '../../core/services/person.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { Person } from '../../core/models/person.model';
import { User } from '../../core/models/user.model';
import { PersonFormDialogComponent } from './person-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';

@Component({
  selector: 'app-person-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './person-list.component.html',
  styleUrl: './person-list.component.scss',
})
export class PersonListComponent implements OnInit {
  private readonly peopleApi = inject(PersonService);
  private readonly usersApi = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly rows = signal<Person[]>([]);
  protected userNames = new Map<number, string>();
  readonly columns = ['name', 'surname', 'createdBy', 'createdAt', 'actions'];

  ngOnInit(): void {
    this.usersApi.list().subscribe((users) => {
      this.userNames = new Map(users.map((u) => [u.id, u.name]));
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.peopleApi.list().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Erro ao carregar pessoas.');
      },
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(PersonFormDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.peopleApi.create(result).subscribe({
        next: () => {
          this.notify.success('Pessoa cadastrada!');
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

  openEdit(row: Person): void {
    const ref = this.dialog.open(PersonFormDialogComponent, { width: '480px', data: { person: row } });
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.peopleApi.update(row.id, result).subscribe({
        next: () => {
          this.notify.success('Pessoa atualizada!');
          this.load();
        },
        error: (e: { status?: number; statusText?: string; error?: unknown }) => {
          const msg =
            (typeof e?.error === 'string' ? e.error : null) ??
            e?.statusText ??
            'Erro ao atualizar.';
          this.notify.error(msg);
        },
      });
    });
  }

  createdByLabel(row: Person): string {
    return this.userNames.get(row.createdByUserId) ?? '—';
  }

  confirmDelete(row: Person): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Remover pessoa',
          message: `Excluir "${row.name} ${row.surname}"? As despesas associadas não serão alteradas.`,
        },
      }
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.peopleApi.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Pessoa removida.');
          this.load();
        },
        error: (e: { status?: number; statusText?: string }) => {
          this.notify.error(e?.statusText ?? 'Erro ao excluir.');
        },
      });
    });
  }
}
