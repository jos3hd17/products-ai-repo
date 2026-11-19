import { describe, it, expect } from 'vitest';
import { convertToParamMap } from '@angular/router';
import {
  DEFAULT_FILTERS,
  filtersReplaced,
  filtersToParams,
  parseFilters,
  productFilters,
} from './product-filters';
describe('shareable product filter state', () => {
  it('preserves only filter state, not records or secrets', () =>
    expect(Object.keys(DEFAULT_FILTERS).sort()).toEqual([
      'category',
      'page',
      'pageSize',
      'search',
      'sortBy',
      'sortDirection',
    ]));
  it('parses bounded URL state', () =>
    expect(
      parseFilters(
        convertToParamMap({
          page: '2',
          pageSize: '10',
          search: ' seed ',
          category: ' Seeds ',
          sortBy: 'priceMinor',
          sortDirection: 'asc',
        }),
      ),
    ).toEqual({
      page: 2,
      pageSize: 10,
      search: 'seed',
      category: 'Seeds',
      sortBy: 'priceMinor',
      sortDirection: 'asc',
    }));
  it('rejects bad query coercions and unknown sorting', () =>
    expect(
      parseFilters(
        convertToParamMap({
          page: '-1',
          pageSize: '101',
          sortBy: 'passwordHash',
          sortDirection: 'bad',
        }),
      ),
    ).toEqual(DEFAULT_FILTERS));
  it.each(['1.2', '1e2', '10001', 'Infinity'])('does not accept invalid page %s', (page) =>
    expect(parseFilters(convertToParamMap({ page })).page).toBe(1),
  );
  it('reducer and selectors preserve immutable URL-derived filters', () => {
    const filters = { ...DEFAULT_FILTERS, page: 3 };
    const state = productFilters.reducer(DEFAULT_FILTERS, filtersReplaced({ filters }));
    expect(state).toEqual(filters);
    expect(state).not.toBe(filters);
    expect(productFilters.selectPage.projector(state)).toBe(3);
    expect(DEFAULT_FILTERS.page).toBe(1);
  });
  it('round-trips URL state and omits empty filters', () => {
    const encoded = filtersToParams(DEFAULT_FILTERS);
    expect(encoded).not.toHaveProperty('search');
    expect(encoded).not.toHaveProperty('category');
    expect(parseFilters(convertToParamMap(encoded))).toEqual(DEFAULT_FILTERS);
  });
});
