import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CancelExpenseDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-cancel-expense-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="content">
      <form [formGroup]="form">
        <p class="msg">{{ data.message }}</p>
        <p class="hint">
          <strong>Cancelar</strong> mantém o registro no histórico, mas ele deixa de contar como gasto ativo.
          <strong>Excluir</strong> apaga definitivamente (use na lixeira da linha).
        </p>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Motivo ou observação (opcional)</mat-label>
          <textarea matInput formControlName="note" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="null">Voltar</button>
      <button mat-stroked-button color="warn" type="button" (click)="confirm()">Cancelar gasto</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .content {
        min-width: min(100vw - 48px, 400px);
        padding-top: 0.5rem;
      }
      .msg {
        margin: 0 0 0.75rem;
      }
      .hint {
        margin: 0 0 1rem;
        font-size: 0.88rem;
        line-height: 1.45;
        opacity: 0.88;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class CancelExpenseDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject<CancelExpenseDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CancelExpenseDialogComponent, { note: string } | null>);

  readonly form = this.fb.nonNullable.group({
    note: [''],
  });

  confirm(): void {
    this.ref.close({ note: this.form.controls.note.value.trim() });
  }
}
