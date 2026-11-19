import { Product, ProductInput } from './product';
const id = '507f1f77bcf86cd799439011';
const input = { name: 'Seeds', priceMinor: 1250, stock: 3 };
describe('Product invariants', () => {
  it('normalizes strings without floating-point money arithmetic', () => {
    expect(Product.create(id, { ...input, name: ' Seeds ', category: ' Planting ' }).toData()).toMatchObject({ id, name: 'Seeds', category: 'Planting', priceMinor: 1250 });
  });
  it.each([{ name: '' }, { name: '  ' }, { name: 'a'.repeat(121) }, { priceMinor: -1 }, { priceMinor: 1.5 }, { priceMinor: Number.MAX_SAFE_INTEGER + 1 }, { priceMinor: NaN }, { stock: -1 }, { stock: 1.5 }, { stock: Infinity }, { stock: Number.MAX_SAFE_INTEGER + 1 }, { description: null }, { category: null }, { priceMinor: null }, { stock: null }])('rejects invalid product %p', patch => {
    expect(() => Product.create(id, { ...input, ...patch } as ProductInput)).toThrow();
  });
  it('permits zero price/stock and max safe integers', () => {
    expect(Product.create(id, { ...input, priceMinor: 0, stock: 0 }).toData().stock).toBe(0);
    expect(Product.create(id, { ...input, priceMinor: Number.MAX_SAFE_INTEGER }).toData().priceMinor).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('rejects malformed IDs and missing required fields', () => {
    expect(() => Product.create('bad-id', input)).toThrow('Invalid product identifier');
    expect(() => Product.create(id, {} as ProductInput)).toThrow();
  });
  it('updates immutably and preserves creation timestamp', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const later = new Date('2026-01-02T00:00:00Z');
    const original = Product.create(id, input, now);
    const updated = original.update({ stock: 7 }, later).toData();
    expect(updated.createdAt).toEqual(now); expect(updated.updatedAt).toEqual(later);
    expect(updated.stock).toBe(7); expect(original.toData().stock).toBe(3);
  });
  it('does not expose mutable internal Dates', () => {
    const product = Product.create(id, input, new Date('2026-01-01'));
    const state = product.toData(); state.createdAt.setUTCFullYear(1990);
    expect(product.toData().createdAt.getUTCFullYear()).toBe(2026);
  });
  it('rejects empty patches, unknown fields and invalid timestamp sequences', () => {
    const product = Product.create(id, input, new Date('2026-01-01'));
    expect(() => product.update({})).toThrow();
    expect(() => product.update({ unexpected: true } as never)).toThrow();
    expect(() => product.update({ stock: 2 }, new Date('2025-01-01'))).toThrow();
  });
});
