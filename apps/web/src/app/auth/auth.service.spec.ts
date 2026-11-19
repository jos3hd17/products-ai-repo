import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
const token = { accessToken: 'synthetic-access', tokenType: 'Bearer', expiresIn: 900 };
const user = {
  id: 'user',
  email: 'demo@example.test',
  createdAt: '2026-11-19T00:00:00Z',
  updatedAt: '2026-11-19T00:00:00Z',
};
describe('memory-only authentication lifecycle', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('login sets cookie request controls and loads safe current-user data', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    let result: unknown;
    auth
      .login({ email: user.email, password: 'synthetic-password' })
      .subscribe((x) => (result = x));
    const request = http.expectOne('/auth/login');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
    request.flush(token);
    http.expectOne('/auth/me').flush(user);
    expect(auth.token).toBe(token.accessToken);
    expect(auth.user()).toEqual(user);
    expect(result).toEqual(user);
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });
  it('shares recovery among subscribers and makes one refresh request', () => {
    const results: boolean[] = [];
    auth.ensureSession().subscribe((x) => results.push(x));
    auth.ensureSession().subscribe((x) => results.push(x));
    const refresh = http.expectOne('/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    expect(refresh.request.body).toEqual({});
    refresh.flush(token);
    http.expectOne('/auth/me').flush(user);
    expect(results).toEqual([true, true]);
    expect(auth.status()).toBe('authenticated');
  });
  it('does not repeatedly recover after refresh rejection', () => {
    auth.ensureSession().subscribe((value) => expect(value).toBe(false));
    http.expectOne('/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    auth.ensureSession().subscribe((value) => expect(value).toBe(false));
    http.expectNone('/auth/refresh');
    expect(auth.token).toBeNull();
  });
  it('clears partial recovery when current-user lookup fails', () => {
    auth.ensureSession().subscribe((value) => expect(value).toBe(false));
    http.expectOne('/auth/refresh').flush(token);
    http.expectOne('/auth/me').flush({}, { status: 500, statusText: 'Error' });
    expect(auth.status()).toBe('anonymous');
    expect(auth.token).toBeNull();
  });
  it('late refresh cannot restore the session after logout', () => {
    let rejected = false;
    auth.refresh().subscribe({ error: () => (rejected = true) });
    const refresh = http.expectOne('/auth/refresh');
    auth.logout().subscribe();
    const logout = http.expectOne('/auth/logout');
    expect(logout.request.withCredentials).toBe(true);
    logout.flush(null, { status: 204, statusText: 'No Content' });
    refresh.flush(token);
    expect(rejected).toBe(true);
    expect(auth.token).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });
  it('failed login removes partial access state', () => {
    auth
      .login({ email: user.email, password: 'synthetic-password' })
      .subscribe({ error: () => {} });
    http.expectOne('/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token).toBeNull();
    expect(auth.user()).toBeNull();
  });
});
