import { ProductFilters } from '../models/product.models';

export const DEFAULT_FILTERS: ProductFilters = {
  page: 1,
  pageSize: 20,
  search: '',
  category: '',
  sortBy: 'createdAt',
  sortDirection: 'desc',
};
