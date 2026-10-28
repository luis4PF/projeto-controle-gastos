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
import { MatRadioModule } from '@angular/material/radio';
import { Category } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { rootCategoriesSorted } from '../../shared/utils/category-path';

/** Criação: `group` = só nome (ex.: IPVA); `item` = nome + grupo pai (ex.: IPVA 2026 dentro de IPVA). */
export type CategoryCreateMode = 'group' | 'item';

export interface CategoryFormDialogData {
  category?: Category;
  createMode?: CategoryCreateMode;
}

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
  ],
  templateUrl: './category-form-dialog.component.html',
  styleUrl: './category-form-dialog.component.scss',
})
export class CategoryFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoryFormDialogComponent, Category | false>);
  readonly data = inject<CategoryFormDialogData>(MAT_DIALOG_DATA);
  private readonly categoriesApi = inject(CategoryService);

  /** Grupos disponíveis para vincular um item (apenas raiz). */
  protected groupOptions: { id: string; name: string }[] = [];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    parentId: [''],
  });

  /** Modo na criação: grupo vs item. */
  protected createKind: CategoryCreateMode = 'group';

  protected dialogTitle(): string {
    const c = this.data.category;
    if (c) {
      return c.parentId == null ? 'Editar grupo' : 'Editar item';
    }
    return this.createKind === 'group' ? 'Novo grupo' : 'Novo item no grupo';
  }

  ngOnInit(): void {
    if (!this.data.category && this.data.createMode) {
      this.createKind = this.data.createMode;
    }

    this.categoriesApi.list().subscribe((cats) => {
      const editing = this.data.category;
      const roots = rootCategoriesSorted(cats);
      const excludeId = editing?.id;
      this.groupOptions = roots
        .filter((c) => c.id !== excludeId)
        .map((c) => ({ id: c.id, name: c.name }));

      if (editing) {
        const isGroup = editing.parentId == null;
        this.form.patchValue({
          name: editing.name,
          parentId: editing.parentId ?? '',
        });
        if (!isGroup) {
          this.form.controls.parentId.setValidators([Validators.required]);
        }
      } else {
        if (this.createKind === 'item') {
          this.form.controls.parentId.setValidators([Validators.required]);
        }
      }
      this.form.controls.parentId.updateValueAndValidity();
    });
  }

  protected setCreateKind(kind: CategoryCreateMode): void {
    this.createKind = kind;
    if (kind === 'group') {
      this.form.patchValue({ parentId: '' });
      this.form.controls.parentId.clearValidators();
    } else {
      this.form.controls.parentId.setValidators([Validators.required]);
    }
    this.form.controls.parentId.updateValueAndValidity();
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    const v = this.form.getRawValue();
    const editing = this.data.category;

    if (!editing) {
      if (this.createKind === 'item' && !v.parentId?.trim()) {
        this.form.controls.parentId.setErrors({ required: true });
        this.form.markAllAsTouched();
        return;
      }
    } else if (editing.parentId != null && !v.parentId?.trim()) {
      this.form.controls.parentId.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    let parentId: string | null;
    if (editing) {
      parentId = editing.parentId == null ? null : v.parentId.trim() || null;
    } else {
      parentId = this.createKind === 'group' ? null : v.parentId.trim() || null;
    }

    const cat = this.data.category;
    if (cat) {
      this.dialogRef.close({
        ...cat,
        name: v.name.trim(),
        parentId,
      } as Category);
    } else {
      this.dialogRef.close({
        id: '',
        userId: 0, // Será definido no backend
        name: v.name.trim(),
        parentId,
      } as Category);
    }
  }

  protected isEditingGroup(): boolean {
    return this.data.category?.parentId == null;
  }
}
