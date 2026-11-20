import { InjectionToken } from '@angular/core';
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
