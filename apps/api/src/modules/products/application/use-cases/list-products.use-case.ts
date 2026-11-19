import { DomainError } from '../../../../shared/domain/domain-error';
import { PRODUCT_SORT_FIELDS, ProductQuery, ProductRepositoryPort } from '../../domain/ports/product.repository.port';
import { ListProductsInput, ListProductsOutput } from '../dto/product.contracts';
export class ListProductsUseCase {
  constructor(private readonly repository: ProductRepositoryPort) {}
  async execute(input: ListProductsInput = {}): Promise<ListProductsOutput> {
    const query: ProductQuery = { ...input, page: input.page ?? 1, pageSize: input.pageSize ?? 20, sortBy: input.sortBy ?? 'createdAt', sortDirection: input.sortDirection ?? 'desc' };
    if (!Number.isInteger(query.page) || query.page < 1 || query.page > 10000 || !Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100 || !PRODUCT_SORT_FIELDS.includes(query.sortBy) || !['asc', 'desc'].includes(query.sortDirection)) throw new DomainError('INVALID_INPUT', 'Invalid product list query');
    for (const [key, max] of [['search', 120], ['category', 80]] as const) {
      const value = query[key];
      if (value !== undefined) {
        if (typeof value !== 'string' || value.trim().length > max) throw new DomainError('INVALID_INPUT', 'Invalid product list query');
        query[key] = value.trim();
      }
    }
    const page = await this.repository.list(query);
    return { items: page.items.map(item => item.toData()), total: page.total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(page.total / query.pageSize), itemCount: page.items.length, filters: { search: query.search ?? null, category: query.category ?? null, sortBy: query.sortBy, sortDirection: query.sortDirection } };
  }
}
