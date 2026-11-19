import { describe, it, expect } from 'vitest';
import { decimalPrice, displayPrice, parsePrice } from './money';
describe('integer minor-unit money boundaries', () => {
  it.each([
    ['0', 0],
    ['12.50', 1250],
    [' 1.2 ', 120],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER],
    ['0001.01', 101],
  ])('parses %s exactly', (text, amount) => expect(parsePrice(text)).toBe(amount));
  it.each(['-1', '1.001', '1e3', '1,20', 'Infinity', 'NaN', '', '90071992547409.92', '.50'])(
    'rejects unsafe/ambiguous %s',
    (text) => expect(parsePrice(text)).toBeNull(),
  );
  it('round-trips safe integer boundary without float multiplication', () => {
    expect(decimalPrice(Number.MAX_SAFE_INTEGER)).toBe('90071992547409.91');
    expect(parsePrice(decimalPrice(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(displayPrice(123456)).toBe('1,234.56');
  });
});
