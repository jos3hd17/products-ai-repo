import { Product, ProductPatch } from '../entities/product';
export const PRODUCT_REPOSITORY_PORT = Symbol('ProductRepositoryPort');
export const PRODUCT_SORT_FIELDS = ['name', 'priceMinor', 'stock', 'createdAt', 'updatedAt'] as const;
export type ProductSortField = typeof PRODUCT_SORT_FIELDS[number];
export interface ProductQuery { page: number; pageSize: number; search?: string; category?: string; sortBy: ProductSortField; sortDirection: 'asc' | 'desc'; }
export interface ProductPage { items: Product[]; total: number; }
export interface ProductRepositoryPort {
  nextId(): string; create(product: Product): Promise<Product>; findById(id: string): Promise<Product | null>;
  list(query: ProductQuery): Promise<ProductPage>; update(id: string, changes: ProductPatch): Promise<Product | null>; delete(id: string): Promise<boolean>;
}
