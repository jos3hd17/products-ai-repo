import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { safeReturnUrl } from '../../utils/return-url.util';
import { friendlyError } from '../../../shared/utils/friendly-error.util';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly busy = signal(false);
  readonly error = signal(
    this.route.snapshot.queryParamMap.get('logout') === 'unconfirmed'
      ? 'No pudimos confirmar el cierre en el servidor. Vuelve a intentarlo cuando tengas conexión.'
      : '',
  );
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  submit(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.error.set('');
    this.busy.set(true);
    const raw = this.form.getRawValue();
    this.auth
      .login({ email: raw.email.trim(), password: raw.password })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
          );
        },
        error: (e) => this.error.set(friendlyError(e)),
      });
  }
}
