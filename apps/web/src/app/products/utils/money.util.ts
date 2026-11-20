/** Decimal strings are parsed by digits, without floating-point multiplication. */
export function parsePrice(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const digits = match[1] + (match[2] ?? '').padEnd(2, '0');
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}
export function decimalPrice(minor: number): string {
  return `${Math.trunc(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
export function displayPrice(minor: number): string {
  const parts = decimalPrice(minor).split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
}
