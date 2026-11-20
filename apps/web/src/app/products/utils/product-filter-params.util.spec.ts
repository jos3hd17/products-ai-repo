import { describe, it, expect } from 'vitest';
import { convertToParamMap } from '@angular/router';
import { DEFAULT_FILTERS } from '../constants/product-filters.constants';
import { filtersToParams, parseFilters } from './product-filter-params.util';
describe('product filter URL parameters', () => {
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
  it('round-trips URL state and omits empty filters', () => {
    const encoded = filtersToParams(DEFAULT_FILTERS);
    expect(encoded).not.toHaveProperty('search');
    expect(encoded).not.toHaveProperty('category');
    expect(parseFilters(convertToParamMap(encoded))).toEqual(DEFAULT_FILTERS);
  });
});
