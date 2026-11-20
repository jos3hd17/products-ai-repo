import { describe, it, expect } from 'vitest';
import { DEFAULT_FILTERS } from '../constants/product-filters.constants';
import { filtersReplaced, productFilters } from './product-filters.store';
describe('product filter state', () => {
  it('preserves only filter state, not records or secrets', () =>
    expect(Object.keys(DEFAULT_FILTERS).sort()).toEqual([
      'category',
      'page',
      'pageSize',
      'search',
      'sortBy',
      'sortDirection',
    ]));
  it('reducer and selectors preserve immutable URL-derived filters', () => {
    const filters = { ...DEFAULT_FILTERS, page: 3 };
    const state = productFilters.reducer(DEFAULT_FILTERS, filtersReplaced({ filters }));
    expect(state).toEqual(filters);
    expect(state).not.toBe(filters);
    expect(productFilters.selectPage.projector(state)).toBe(3);
    expect(DEFAULT_FILTERS.page).toBe(1);
  });
});
