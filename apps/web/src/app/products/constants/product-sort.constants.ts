export const SORT_FIELDS = ['name', 'priceMinor', 'stock', 'createdAt', 'updatedAt'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
