import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface MarkParcelPaidDialogData {
  title: string;
  summary: string;
}

@Component({
  selector: 'app-mark-parcel-paid-dialog',
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
        <p class="summary">{{ data.summary }}</p>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Observação (opcional)</mat-label>
          <textarea matInput formControlName="observation" rows="3" placeholder="Ex.: pago com pontos, desconto…"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="null">Voltar</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">Confirmar pagamento</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .content {
        min-width: min(100vw - 48px, 380px);
        padding-top: 0.5rem;
      }
      .summary {
        margin: 0 0 1rem;
        font-size: 0.95rem;
        opacity: 0.9;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class MarkParcelPaidDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject<MarkParcelPaidDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MarkParcelPaidDialogComponent, { observation: string } | null>);

  readonly form = this.fb.nonNullable.group({
    observation: [''],
  });

  confirm(): void {
    this.ref.close({ observation: this.form.controls.observation.value.trim() });
  }
}
