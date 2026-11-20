import { inject } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';

export function apiEndpoint(path: string): string {
  return inject(API_BASE_URL) + path;
}
export function isProtectedApiUrl(
  value: string,
  base: string,
  origin = window.location.origin,
): boolean {
  try {
    const url = new URL(value, origin);
    const api = new URL(base || origin);
    return (
      !url.username &&
      !url.password &&
      url.origin === api.origin &&
      (url.pathname === '/auth/me' ||
        url.pathname === '/products' ||
        url.pathname.startsWith('/products/'))
    );
  } catch {
    return false;
  }
}
