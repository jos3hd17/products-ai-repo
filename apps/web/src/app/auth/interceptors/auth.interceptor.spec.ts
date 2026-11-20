import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { API_BASE_URL } from '../../core/config/api-config';
import { isProtectedApiUrl } from '../../core/utils/api-url.util';
const base = 'https://api.example.test';
const profile = {
  id: 'user',
  email: 'demo@example.test',
  createdAt: '2026-11-19T00:00:00Z',
  updatedAt: '2026-11-19T00:00:00Z',
};
describe('functional auth interceptor with actual single-flight service', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  function login(token = 'old-token'): void {
    auth.login({ email: profile.email, password: 'synthetic' }).subscribe();
    const req = http.expectOne(base + '/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: token, tokenType: 'Bearer', expiresIn: 900 });
    http.expectOne(base + '/auth/me').flush(profile);
  }
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: API_BASE_URL, useValue: base },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    login();
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  it('only adds Bearer on exact configured API resources', () => {
    for (const url of [
      base + '/products',
      'https://attacker.example/products',
      base + '.attacker.example/products',
      base + '/docs',
      base + '/products-evil',
    ]) {
      client.get(url).subscribe();
      const req = http.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(url === base + '/products');
      req.flush({});
    }
  });
  it('coordinates concurrent401 responses through one refresh and retries each once', () => {
    client.get(base + '/products').subscribe();
    client.get(base + '/products/123').subscribe();
    const first = http.expectOne(base + '/products');
    const second = http.expectOne(base + '/products/123');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    second.flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = http.expectOne(base + '/auth/refresh');
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    expect(refresh.request.headers.get('X-CSRF-Protection')).toBe('1');
    refresh.flush({ accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 900 });
    for (const url of [base + '/products', base + '/products/123']) {
      const retry = http.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
      retry.flush({});
    }
  });
  it('uses the already-refreshed token for a late401 without another rotation', () => {
    client.get(base + '/products').subscribe();
    client.get(base + '/products/123').subscribe();
    const first = http.expectOne(base + '/products');
    const late = http.expectOne(base + '/products/123');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(base + '/auth/refresh')
      .flush({ accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 900 });
    http.expectOne(base + '/products').flush({});
    late.flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(base + '/auth/refresh');
    const retry = http.expectOne(base + '/products/123');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({});
  });
  it('does not loop when refresh is rejected', () => {
    let rejected = false;
    client.get(base + '/products').subscribe({ error: () => (rejected = true) });
    http.expectOne(base + '/products').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(base + '/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(rejected).toBe(true);
    expect(auth.token).toBeNull();
    expect(router.navigate).toHaveBeenCalled();
    http.expectNone(base + '/products');
    http.expectNone(base + '/auth/refresh');
  });
  it('a retry401 clears the session but never triggers a second refresh', () => {
    client.get(base + '/products').subscribe({ error: () => {} });
    http.expectOne(base + '/products').flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(base + '/auth/refresh')
      .flush({ accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 900 });
    http.expectOne(base + '/products').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(base + '/auth/refresh');
    expect(auth.token).toBeNull();
  });
  it('a retry500 preserves authentication and does not redirect', () => {
    client.get(base + '/products').subscribe({ error: () => {} });
    http.expectOne(base + '/products').flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(base + '/auth/refresh')
      .flush({ accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 900 });
    http.expectOne(base + '/products').flush({}, { status: 500, statusText: 'Error' });
    expect(auth.token).toBe('new-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('does not refresh on non401 errors', () => {
    client
      .get(base + '/products')
      .subscribe({ error: (error: HttpErrorResponse) => expect(error.status).toBe(403) });
    http.expectOne(base + '/products').flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone(base + '/auth/refresh');
  });
  it('never retries an old request under a newly logged-in identity', () => {
    let rejected = false;
    client
      .patch(base + '/products/123', { stock: 0 })
      .subscribe({ error: () => (rejected = true) });
    const old = http.expectOne(base + '/products/123');
    login('new-user-token');
    old.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(rejected).toBe(true);
    expect(auth.token).toBe('new-user-token');
    http.expectNone(base + '/auth/refresh');
    http.expectNone(base + '/products/123');
  });
});
it('rejects origin/prefix lookalikes and credential-bearing URLs', () => {
  expect(isProtectedApiUrl('https://api.example.test.evil/products', base)).toBe(false);
  expect(isProtectedApiUrl('https://user:pass@api.example.test/products', base)).toBe(false);
  expect(isProtectedApiUrl(base + '/products-evil', base)).toBe(false);
  expect(isProtectedApiUrl('/products', '', 'https://app.example.test')).toBe(true);
});
