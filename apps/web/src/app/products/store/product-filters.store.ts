import { createAction, createFeature, createReducer, on, props } from '@ngrx/store';
import { ProductFilters } from '../models/product.models';
import { DEFAULT_FILTERS } from '../constants/product-filters.constants';

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
