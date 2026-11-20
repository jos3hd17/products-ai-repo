import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { LoginInput, SafeUser, TokenResponse } from '../models/auth.models';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private access: string | null = null;
  private generation = 0;
  private refreshRequest: Observable<TokenResponse> | null = null;
  private recovery: Observable<boolean> | null = null;
  readonly user = signal<SafeUser | null>(null);
  readonly status = signal<'unknown' | 'authenticated' | 'anonymous'>('unknown');
  get token(): string | null {
    return this.access;
  }
  get sessionVersion(): number {
    return this.generation;
  }
  clearSession(): void {
    this.generation++;
    this.access = null;
    this.user.set(null);
    this.status.set('anonymous');
    this.refreshRequest = null;
    this.recovery = null;
  }
  login(input: LoginInput): Observable<SafeUser> {
    this.clearSession();
    const version = this.generation;
    return this.http
      .post<TokenResponse>(this.base + '/auth/login', input, this.cookieOptions())
      .pipe(
        tap((response) => this.accept(response, version)),
        switchMap(() => this.http.get<SafeUser>(this.base + '/auth/me')),
        tap((user) => {
          if (version !== this.generation) throw new Error('Session changed');
          this.user.set(user);
        }),
        catchError((error) => {
          if (version === this.generation) this.clearSession();
          return throwError(() => error);
        }),
      );
  }
  refresh(): Observable<TokenResponse> {
    if (this.refreshRequest) return this.refreshRequest;
    const version = this.generation;
    const request = this.http
      .post<TokenResponse>(this.base + '/auth/refresh', {}, this.cookieOptions())
      .pipe(
        tap((response) => this.accept(response, version)),
        catchError((error) => {
          if (version === this.generation) this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          if (this.refreshRequest === request) this.refreshRequest = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.refreshRequest = request;
    return request;
  }
  ensureSession(): Observable<boolean> {
    if (this.status() === 'authenticated' && this.user()) return of(true);
    if (this.status() === 'anonymous') return of(false);
    if (this.recovery) return this.recovery;
    const version = this.generation;
    const request = this.refresh().pipe(
      switchMap(() => this.http.get<SafeUser>(this.base + '/auth/me')),
      tap((user) => {
        if (version !== this.generation) throw new Error('Session changed');
        this.user.set(user);
      }),
      map(() => true),
      catchError(() => {
        if (version === this.generation) this.clearSession();
        return of(false);
      }),
      finalize(() => {
        if (this.recovery === request) this.recovery = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.recovery = request;
    return request;
  }
  logout(): Observable<void> {
    this.clearSession();
    return this.http.post<void>(this.base + '/auth/logout', {}, this.cookieOptions());
  }
  private accept(response: TokenResponse, version: number): void {
    if (version !== this.generation) throw new Error('Session changed');
    if (!response.accessToken || response.tokenType !== 'Bearer')
      throw new Error('Invalid authentication response');
    this.access = response.accessToken;
    this.status.set('authenticated');
  }
  private cookieOptions() {
    return { withCredentials: true, headers: { 'X-CSRF-Protection': '1' } };
  }
}
