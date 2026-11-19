import { ProductData, ProductInput, ProductPatch } from '../../domain/entities/product';
import { ProductQuery } from '../../domain/ports/product.repository.port';
export type CreateProductInput = ProductInput;
export type UpdateProductInput = ProductPatch;
export type ListProductsInput = Partial<ProductQuery>;
export interface ListProductsOutput { items: ProductData[]; total: number; page: number; pageSize: number; totalPages: number; itemCount: number; filters: { search: string | null; category: string | null; sortBy: ProductQuery['sortBy']; sortDirection: ProductQuery['sortDirection']; }; }
