import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CategoryService } from '../../core/services/category.service';
import { NotificationService } from '../../core/services/notification.service';
import { Category } from '../../core/models/category.model';
import { categoryPath } from '../../shared/utils/category-path';
import {
  CategoryFormDialogComponent,
  CategoryFormDialogData,
} from './category-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  private readonly categoriesApi = inject(CategoryService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly rows = signal<Category[]>([]);
  readonly columns = ['type', 'path', 'name', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoriesApi.list().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Erro ao carregar categorias.');
      },
    });
  }

  pathLabel(row: Category): string {
    return categoryPath(this.rows(), row.id);
  }

  typeLabel(row: Category): string {
    return row.parentId == null ? 'Grupo' : 'Item';
  }

  openCreateGroup(): void {
    const ref = this.dialog.open<CategoryFormDialogComponent, CategoryFormDialogData, Category | false>(
      CategoryFormDialogComponent,
      { width: '480px', data: { createMode: 'group' } }
    );
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.categoriesApi
        .create({ name: result.name, parentId: result.parentId })
        .subscribe({
          next: () => {
            this.notify.success('Grupo criado.');
            this.load();
          },
          error: () => this.notify.error('Erro ao salvar.'),
        });
    });
  }

  openCreateItem(): void {
    const ref = this.dialog.open<CategoryFormDialogComponent, CategoryFormDialogData, Category | false>(
      CategoryFormDialogComponent,
      { width: '480px', data: { createMode: 'item' } }
    );
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.categoriesApi
        .create({ name: result.name, parentId: result.parentId })
        .subscribe({
          next: () => {
            this.notify.success('Item criado e vinculado ao grupo.');
            this.load();
          },
          error: () => this.notify.error('Erro ao salvar.'),
        });
    });
  }

  openEdit(row: Category): void {
    const ref = this.dialog.open<CategoryFormDialogComponent, CategoryFormDialogData, Category | false>(
      CategoryFormDialogComponent,
      { width: '480px', data: { category: row } }
    );
    ref.afterClosed().subscribe((result) => {
      if (result === false || result == null) return;
      this.categoriesApi
        .update(row.id, { name: result.name, parentId: result.parentId })
        .subscribe({
          next: () => {
            this.notify.success('Categoria atualizada.');
            this.load();
          },
          error: () => this.notify.error('Erro ao atualizar.'),
        });
    });
  }

  confirmDelete(row: Category): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Excluir categoria',
          message: `Excluir "${row.name}"?`,
        },
      }
    );
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.categoriesApi.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Categoria excluída.');
          this.load();
        },
        error: (e: { status?: number }) => {
          if (e?.status === 400) {
            this.notify.error('Não é possível excluir: há subcategorias ou gastos vinculados.');
          } else {
            this.notify.error('Erro ao excluir.');
          }
        },
      });
    });
  }
}
