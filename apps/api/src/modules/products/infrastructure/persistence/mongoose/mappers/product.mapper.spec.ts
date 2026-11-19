import { Product } from '../../../../domain/entities/product';
import { ProductMapper } from './product.mapper';
import { ProductSchema } from '../schemas/product.schema';
import { literalSearchPattern } from '../repositories/mongoose-product.repository';
const id = '507f1f77bcf86cd799439011';
it('maps persistence identifiers without leaking Mongoose details', () => {
  const product = Product.create(id, { name: 'Seeds', priceMinor: 123, stock: 4, category: 'Crops' }, new Date('2026-01-01'));
  expect(ProductMapper.toDomain(ProductMapper.toPersistence(product)).toData()).toEqual(product.toData());
  expect(ProductMapper.toDomain(ProductMapper.toPersistence(product)).toData()).not.toHaveProperty('_id');
});
it('escapes all regular-expression metacharacters in literal search', () => {
  const text = 'seeds.*+?^${}()|[]\\';
  const regex = new RegExp(literalSearchPattern(text), 'i');
  expect(regex.test(text)).toBe(true);
  expect(regex.test('seeds-anything')).toBe(false);
  expect(new RegExp(literalSearchPattern('.*')).test('anything')).toBe(false);
});
it('declares stable pagination and category indexes', () => {
  expect(ProductSchema.indexes().map(([fields]) => fields)).toEqual(expect.arrayContaining([{ createdAt: -1, _id: -1 }, { category: 1, createdAt: -1, _id: -1 }]));
});

it.each(['name', 'priceMinor', 'stock', 'updatedAt'])('indexes %s ordering globally and within a category', field => {
  const indexes = ProductSchema.indexes().map(([fields]) => fields);
  expect(indexes).toEqual(expect.arrayContaining([{ [field]: 1, _id: 1 }, { category: 1, [field]: 1, _id: 1 }]));
});
