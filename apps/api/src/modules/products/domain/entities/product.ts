import { DomainError } from '../../../../shared/domain/domain-error';
export interface ProductInput { name: string; priceMinor: number; stock: number; description?: string; category?: string; }
export type ProductPatch = Partial<ProductInput>;
export interface ProductData extends ProductInput { id: string; createdAt: Date; updatedAt: Date; }
export class Product {
  private constructor(private readonly data: ProductData) {}
  static assertId(id: string): void {
    if (typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id)) throw new DomainError('INVALID_INPUT', 'Invalid product identifier');
  }
  static validateChanges(input: ProductPatch, requireAll = false): ProductPatch {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DomainError('INVALID_INPUT', 'Invalid product input');
    const allowed = ['name', 'priceMinor', 'stock', 'description', 'category'];
    if (Object.keys(input).some(k => !allowed.includes(k))) throw new DomainError('INVALID_INPUT', 'Unexpected product property');
    const changes: ProductPatch = {};
    for (const key of ['name', 'description', 'category'] as const) {
      const value = input[key];
      if (value !== undefined) {
        if (typeof value !== 'string') throw new DomainError('INVALID_INPUT', `Invalid ${key}`);
        const trimmed = value.trim();
        const max = key === 'name' ? 120 : key === 'description' ? 2000 : 80;
        if (trimmed.length > max || (key === 'name' && trimmed.length === 0)) throw new DomainError('INVALID_INPUT', `Invalid ${key}`);
        changes[key] = trimmed;
      }
    }
    for (const key of ['priceMinor', 'stock'] as const) {
      const value = input[key];
      if (value !== undefined) {
        if (!Number.isSafeInteger(value) || value < 0) throw new DomainError('INVALID_INPUT', `Invalid ${key}`);
        changes[key] = value;
      }
    }
    if (requireAll && (changes.name === undefined || changes.priceMinor === undefined || changes.stock === undefined)) throw new DomainError('INVALID_INPUT', 'Name, priceMinor and stock are required');
    if (!Object.keys(changes).length) throw new DomainError('INVALID_INPUT', 'At least one product change is required');
    return changes;
  }
  static create(id: string, input: ProductInput, now = new Date()): Product {
    Product.assertId(id);
    const valid = Product.validateChanges(input, true) as ProductInput;
    Product.assertDate(now);
    return new Product({ ...valid, id: id.toLowerCase(), createdAt: new Date(now), updatedAt: new Date(now) });
  }
  static restore(data: ProductData): Product {
    Product.assertId(data.id);
    const { id, createdAt, updatedAt, ...input } = data;
    const valid = Product.validateChanges(input, true) as ProductInput;
    Product.assertDate(createdAt); Product.assertDate(updatedAt);
    if (updatedAt < createdAt) throw new DomainError('INVALID_INPUT', 'Invalid product timestamps');
    return new Product({ ...valid, id: id.toLowerCase(), createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) });
  }
  private static assertDate(date: Date): void {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new DomainError('INVALID_INPUT', 'Invalid product timestamp');
  }
  update(changes: ProductPatch, now = new Date()): Product {
    const patch = Product.validateChanges(changes);
    return Product.restore({ ...this.data, ...patch, updatedAt: now });
  }
  toData(): ProductData { return { ...this.data, createdAt: new Date(this.data.createdAt), updatedAt: new Date(this.data.updatedAt) }; }
}
