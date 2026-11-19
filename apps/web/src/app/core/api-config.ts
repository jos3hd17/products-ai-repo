import { InjectionToken, inject } from '@angular/core';
declare global {
  interface Window {
    __PRODUCTS_CONFIG__?: { apiBaseUrl?: string };
  }
}
/** Public routing configuration only. Never place credentials or tokens here. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const configured = window.__PRODUCTS_CONFIG__?.apiBaseUrl ?? '';
    if (configured === '') return '';
    const url = new URL(configured);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error('Invalid API origin configuration');
    return url.origin;
  },
});
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
