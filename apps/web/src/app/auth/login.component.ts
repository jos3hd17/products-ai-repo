import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './auth.guards';
import { friendlyError } from '../core/friendly-error';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: ` <main class="login-layout">
    <section class="login-story" aria-label="Fieldwork">
      <a class="wordmark" href="/">▰ <span>Fieldwork</span></a>
      <div>
        <p class="eyebrow">CADA PRODUCTO CUENTA</p>
        <h1>Tu catálogo,<br />en buenas manos.</h1>
        <p>
          Un espacio claro para organizar productos, mantener existencias al día y seguir creciendo.
        </p>
      </div>
      <p class="story-footer">
        <span class="status-dot"></span> Menos tareas repetidas. Más tiempo para avanzar.
      </p>
    </section>
    <section class="login-form-section">
      <div class="login-card">
        <span class="pill">TU ESPACIO DE TRABAJO</span>
        <h2>Qué bueno verte.</h2>
        <p class="muted">Ingresa con tu cuenta para administrar el catálogo.</p>
        @if (error()) {
          <div class="notice error" role="alert">{{ error() }}</div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="email">Correo electrónico</label
          ><input
            id="email"
            type="email"
            autocomplete="username"
            formControlName="email"
            placeholder="nombre@empresa.com"
            [attr.aria-invalid]="form.controls.email.touched && form.controls.email.invalid"
            aria-describedby="email-error"
          />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small id="email-error" class="field-error">Ingresa un correo válido.</small>
          }
          <label for="password">Contraseña</label
          ><input
            id="password"
            type="password"
            autocomplete="current-password"
            formControlName="password"
            placeholder="Tu contraseña"
            [attr.aria-invalid]="form.controls.password.touched && form.controls.password.invalid"
            aria-describedby="password-error"
          />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small id="password-error" class="field-error"
              >Ingresa tu contraseña (máximo 128 caracteres).</small
            >
          }
          <button class="button primary full" type="submit" [disabled]="busy()">
            {{ busy() ? 'Ingresando…' : 'Ingresar al catálogo' }} <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p class="login-note">
          El acceso está reservado para cuentas autorizadas.<br />Si necesitas ayuda, contacta a tu
          administrador.
        </p>
      </div>
    </section>
  </main>`,
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
