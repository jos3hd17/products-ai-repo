export function safeReturnUrl(value: string | null): string {
  return value && /^\/catalog(?:\?|$)/.test(value) ? value : '/catalog';
}
