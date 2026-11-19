export interface SafeUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface ProductWrite {
  name: string;
  priceMinor: number;
  stock: number;
  description?: string;
  category?: string;
}
export interface Product extends ProductWrite {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export const SORT_FIELDS = ['name', 'priceMinor', 'stock', 'createdAt', 'updatedAt'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export interface ProductFilters {
  page: number;
  pageSize: number;
  search: string;
  category: string;
  sortBy: SortField;
  sortDirection: 'asc' | 'desc';
}
export interface ProductPage {
  itemCount: number;
  filters: { search: string | null; category: string | null; sortBy: SortField; sortDirection: 'asc' | 'desc' };
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
