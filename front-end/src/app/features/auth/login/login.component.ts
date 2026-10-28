import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  protected readonly busy = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['luis@gmail.com', [Validators.required, Validators.email]],
    password: ['1234', [Validators.required, Validators.minLength(3)]],
  });

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.notify.success('Login realizado com sucesso.');
        void this.router.navigateByUrl('/');
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.busy.set(false);
        const msg =
          err?.error?.message ??
          (typeof err?.message === 'string' ? err.message : 'Falha ao entrar.');
        this.notify.error(msg);
      },
      complete: () => this.busy.set(false),
    });
  }
}
