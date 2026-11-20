import { SortField } from '../constants/product-sort.constants';

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
  filters: {
    search: string | null;
    category: string | null;
    sortBy: SortField;
    sortDirection: 'asc' | 'desc';
  };
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
