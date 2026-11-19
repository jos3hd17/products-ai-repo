import { Product } from '../../domain/entities/product';
import { ProductRepositoryPort } from '../../domain/ports/product.repository.port';
import { CreateProductUseCase } from './create-product.use-case';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';
import { ListProductsUseCase } from './list-products.use-case';
import { UpdateProductUseCase } from './update-product.use-case';
import { DeleteProductUseCase } from './delete-product.use-case';
const id = '507f1f77bcf86cd799439011';
const input = { name: 'Seeds', priceMinor: 100, stock: 2 };
const product = Product.create(id, input);
let repository: jest.Mocked<ProductRepositoryPort>;
beforeEach(() => { repository = { nextId: jest.fn().mockReturnValue(id), create: jest.fn().mockResolvedValue(product), findById: jest.fn().mockResolvedValue(product), list: jest.fn().mockResolvedValue({ items: [product], total: 5 }), update: jest.fn().mockResolvedValue(product), delete: jest.fn().mockResolvedValue(true) }; });
it('creates through the persistence-independent port', async () => {
  expect(await new CreateProductUseCase(repository).execute(input)).toMatchObject({ id, ...input });
  expect(repository.create.mock.calls[0][0]).toBeInstanceOf(Product);
});
it('rejects invalid create input before persistence', async () => {
  await expect(new CreateProductUseCase(repository).execute({ ...input, stock: -1 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(repository.create).not.toHaveBeenCalled();
});
it('reads a valid ID and normalizes its case', async () => {
  await expect(new GetProductByIdUseCase(repository).execute(id.toUpperCase())).resolves.toMatchObject({ id });
  expect(repository.findById).toHaveBeenCalledWith(id);
});
it('returns domain NotFound for missing reads', async () => {
  repository.findById.mockResolvedValue(null);
  await expect(new GetProductByIdUseCase(repository).execute(id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
it('rejects malformed IDs before a repository read', async () => {
  await expect(new GetProductByIdUseCase(repository).execute('bad')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(repository.findById).not.toHaveBeenCalled();
});
it('lists with server pagination metadata and defaults', async () => {
  const result = await new ListProductsUseCase(repository).execute({ pageSize: 2 });
  expect(result).toMatchObject({ total: 5, page: 1, pageSize: 2, totalPages: 3 });
  expect(repository.list).toHaveBeenCalledWith({ page: 1, pageSize: 2, sortBy: 'createdAt', sortDirection: 'desc' });
});
it('handles an empty list without inventing a page', async () => {
  repository.list.mockResolvedValue({ items: [], total: 0 });
  expect((await new ListProductsUseCase(repository).execute()).totalPages).toBe(0);
});
it.each([{ page: 0 }, { page: 10001 }, { pageSize: 101 }, { pageSize: 1.5 }, { sortBy: '$where' }, { sortDirection: 'sideways' }])('rejects invalid query %p before persistence', async input => {
  await expect(new ListProductsUseCase(repository).execute(input as never)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(repository.list).not.toHaveBeenCalled();
});
it('updates only validated changes through the port', async () => {
  await new UpdateProductUseCase(repository).execute(id, { name: ' New name ' });
  expect(repository.update).toHaveBeenCalledWith(id, { name: 'New name' });
});
it('rejects empty/null patches and maps missing updates to NotFound', async () => {
  await expect(new UpdateProductUseCase(repository).execute(id, {})).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await expect(new UpdateProductUseCase(repository).execute(id, { stock: null } as never)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  repository.update.mockResolvedValue(null);
  await expect(new UpdateProductUseCase(repository).execute(id, { stock: 4 })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
it('deletes a product and maps absent resources to NotFound', async () => {
  await expect(new DeleteProductUseCase(repository).execute(id)).resolves.toBeUndefined();
  repository.delete.mockResolvedValue(false);
  await expect(new DeleteProductUseCase(repository).execute(id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

it('returns normalized applied filters and actual page count independently from matching total', async () => {
  const result = await new ListProductsUseCase(repository).execute({ page: 3, pageSize: 2, search: ' Seed ', category: ' Seeds ', sortBy: 'priceMinor', sortDirection: 'asc' });
  expect(result).toMatchObject({ page: 3, pageSize: 2, total: 5, totalPages: 3, itemCount: result.items.length, filters: { search: 'Seed', category: 'Seeds', sortBy: 'priceMinor', sortDirection: 'asc' } });
  expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ page: 3, search: 'Seed', category: 'Seeds' }));
});
