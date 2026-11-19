import { ValidationPipe } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { ListProductsDto } from './list-products.dto';
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const validate = (value: unknown, metatype: new () => object, type: 'body' | 'query' = 'body') => pipe.transform(value, { type, metatype });
it.each(['name', 'priceMinor', 'stock', 'description', 'category'])('rejects null PATCH %s', async field => {
  await expect(validate({ [field]: null }, UpdateProductDto)).rejects.toThrow();
});
it('rejects unrecognized properties and implicit numeric body strings', async () => {
  await expect(validate({ name: 'Seeds', priceMinor: 1, stock: 0, admin: true }, CreateProductDto)).rejects.toThrow();
  await expect(validate({ name: 'Seeds', priceMinor: '1', stock: 0 }, CreateProductDto)).rejects.toThrow();
});
it('only transforms decimal integer pagination strings', async () => {
  expect(await validate({ page: '2', pageSize: '5' }, ListProductsDto, 'query')).toMatchObject({ page: 2, pageSize: 5 });
  for (const page of ['1.5', '1e2', '0x10', '-1', '0']) await expect(validate({ page }, ListProductsDto, 'query')).rejects.toThrow();
});
it('rejects unbounded list parameters and Mongo operator-shaped queries', async () => {
  await expect(validate({ pageSize: '101' }, ListProductsDto, 'query')).rejects.toThrow();
  await expect(validate({ sortBy: '$where' }, ListProductsDto, 'query')).rejects.toThrow();
  await expect(validate({ search: { $ne: '' } }, ListProductsDto, 'query')).rejects.toThrow();
});
