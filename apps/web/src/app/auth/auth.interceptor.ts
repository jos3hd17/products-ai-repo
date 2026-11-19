import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { API_BASE_URL, isProtectedApiUrl } from '../core/api-config';
import { AuthService } from './auth.service';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL);
  if (!isProtectedApiUrl(request.url, base)) return next(request);
  const auth = inject(AuthService);
  const router = inject(Router);
  const original = auth.token;
  const version = auth.sessionVersion;
  const expired = () => {
    if (!router.url.startsWith('/login'))
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
  };
  const authorized = original
    ? request.clone({ setHeaders: { Authorization: `Bearer ${original}` } })
    : request;
  return next(authorized).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401)
        return throwError(() => error);
      if (version !== auth.sessionVersion) return throwError(() => error);
      const refreshed =
        auth.token && auth.token !== original ? of({ accessToken: auth.token }) : auth.refresh();
      return refreshed.pipe(
        switchMap((result) =>
          next(
            request.clone({ setHeaders: { Authorization: `Bearer ${result.accessToken}` } }),
          ).pipe(
            catchError((retryError) => {
              if (
                retryError instanceof HttpErrorResponse &&
                retryError.status === 401 &&
                version === auth.sessionVersion
              )
                auth.clearSession();
              return throwError(() => retryError);
            }),
          ),
        ),
        catchError((refreshError) => {
          if (auth.status() === 'anonymous') expired();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
