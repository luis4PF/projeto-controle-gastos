import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PersonCreateDto, PersonUpdateDto, Person } from '../../core/models/person.model';

export interface PersonFormDialogData {
  person?: Person;
}

@Component({
  selector: 'app-person-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './person-form-dialog.component.html',
  styleUrl: './person-form-dialog.component.scss',
})
export class PersonFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<PersonFormDialogComponent, false | PersonCreateDto | PersonUpdateDto>
  );
  readonly data = inject<PersonFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    surname: ['', [Validators.required, Validators.maxLength(120)]],
  });

  protected get isEditing(): boolean {
    return !!this.data.person;
  }

  ngOnInit(): void {
    if (this.data.person) {
      this.form.patchValue({
        name: this.data.person.name,
        surname: this.data.person.surname,
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name.trim(),
      surname: v.surname.trim(),
    });
  }
}

