import type { SortingState } from '@tanstack/react-table'

export const DEALS_COLLECTION_DEFAULT_SORTING: SortingState = [
  { id: 'collectionOrder', desc: false },
]

/** Standardansicht: nur die versteckte Frist-Reihenfolge, also gruppiert mit Bändern. */
export function isDealsCollectionGroupedSorting(sorting: SortingState): boolean {
  return sorting.length > 0 && sorting.every((item) => item.id === 'collectionOrder')
}

/** Leere oder nur-collectionOrder-Sortierung → wieder die gruppierte Standardansicht. */
export function resolveDealsCollectionSorting(next: SortingState): SortingState {
  const userSort = next.filter((item) => item.id !== 'collectionOrder')
  return userSort.length === 0 ? [...DEALS_COLLECTION_DEFAULT_SORTING] : userSort
}
