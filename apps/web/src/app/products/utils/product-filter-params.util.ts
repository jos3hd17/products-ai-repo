import { ParamMap } from '@angular/router';
import { ProductFilters } from '../models/product.models';
import { SORT_FIELDS, SortField } from '../constants/product-sort.constants';

export function parseFilters(params: ParamMap): ProductFilters {
  const bounded = (key: string, fallback: number, max: number) => {
    const value = params.get(key);
    const n = value && /^\d+$/.test(value) ? Number(value) : NaN;
    return Number.isSafeInteger(n) && n >= 1 && n <= max ? n : fallback;
  };
  const field = params.get('sortBy');
  return {
    page: bounded('page', 1, 10000),
    pageSize: bounded('pageSize', 20, 100),
    search: (params.get('search') ?? '').trim().slice(0, 120),
    category: (params.get('category') ?? '').trim().slice(0, 80),
    sortBy: SORT_FIELDS.includes(field as SortField) ? (field as SortField) : 'createdAt',
    sortDirection: params.get('sortDirection') === 'asc' ? 'asc' : 'desc',
  };
}
export function filtersToParams(filters: ProductFilters): Record<string, string | number> {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
  };
}
