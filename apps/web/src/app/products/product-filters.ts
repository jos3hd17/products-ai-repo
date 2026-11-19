import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { ParamMap } from '@angular/router';
import { ProductFilters, SORT_FIELDS, SortField } from '../core/models';
export const DEFAULT_FILTERS: ProductFilters = {
  page: 1,
  pageSize: 20,
  search: '',
  category: '',
  sortBy: 'createdAt',
  sortDirection: 'desc',
};
export const filtersReplaced = createAction(
  '[Products] Filters replaced',
  props<{ filters: ProductFilters }>(),
);
export const productFilters = createFeature({
  name: 'productFilters',
  reducer: createReducer(
    DEFAULT_FILTERS,
    on(filtersReplaced, (_state, { filters }) => ({ ...filters })),
  ),
});
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
