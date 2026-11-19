import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { LoginComponent } from './login.component';
import { safeReturnUrl } from './auth.guards';
describe('typed login form and safe navigation', () => {
  const auth = { login: vi.fn() };
  beforeEach(() => {
    auth.login.mockReset();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });
  it('rejects invalid fields before contacting the API', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'invalid', password: '' });
    fixture.componentInstance.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('submits credentials and navigates on successful authentication', () => {
    auth.login.mockReturnValue(of({ id: 'u' }));
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'demo@example.test', password: 'synthetic' });
    fixture.componentInstance.submit();
    expect(auth.login).toHaveBeenCalledWith({ email: 'demo@example.test', password: 'synthetic' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/catalog');
  });
  it('shows a friendly error without raw server details', () => {
    auth.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({ status: 500, error: { message: 'SYNTHETIC_INTERNAL_DETAIL' } }),
      ),
    );
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'demo@example.test', password: 'synthetic' });
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El servidor no pudo');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'SYNTHETIC_INTERNAL_DETAIL',
    );
  });
  it('prevents open redirects', () => {
    expect(safeReturnUrl('//attacker.example')).toBe('/catalog');
    expect(safeReturnUrl('https://attacker.example')).toBe('/catalog');
    expect(safeReturnUrl('/catalog?search=Seed')).toBe('/catalog?search=Seed');
    expect(safeReturnUrl('/catalog-attacker')).toBe('/catalog');
  });
});
