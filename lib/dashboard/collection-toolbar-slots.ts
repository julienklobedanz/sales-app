import { userCanCreateReference } from '@/lib/roles/reference-access'
import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'

/** Feste DOM-Reihenfolge der Sammel-Toolbar (§10.8). Positionen rücken nicht nach. */
export const COLLECTION_TOOLBAR_SLOT_IDS = [
  'collection-search',
  'collection-filter-primary',
  'collection-filter-more',
  'collection-view',
  'collection-primary',
  'collection-columns',
] as const

export type CollectionToolbarSlotId = (typeof COLLECTION_TOOLBAR_SLOT_IDS)[number]

export type CollectionToolbarSlotFill = 'filled' | 'empty'

export type CollectionKind = 'references' | 'deals' | 'accounts'

export function collectionToolbarSlotFill(args: {
  collection: CollectionKind
  canCreateReference: boolean
  canCreateAccount?: boolean
}): Record<CollectionToolbarSlotId, CollectionToolbarSlotFill> {
  if (args.collection === 'deals') {
    return {
      'collection-search': 'filled',
      'collection-filter-primary': 'filled',
      'collection-filter-more': 'empty',
      'collection-view': 'empty',
      'collection-primary': 'filled',
      'collection-columns': 'filled',
    }
  }

  if (args.collection === 'accounts') {
    return {
      'collection-search': 'filled',
      'collection-filter-primary': 'filled',
      'collection-filter-more': 'filled',
      'collection-view': 'filled',
      'collection-primary': args.canCreateAccount ? 'filled' : 'empty',
      'collection-columns': 'filled',
    }
  }

  return {
    'collection-search': 'filled',
    'collection-filter-primary': 'filled',
    'collection-filter-more': 'filled',
    'collection-view': 'filled',
    'collection-primary': args.canCreateReference ? 'filled' : 'empty',
    'collection-columns': 'filled',
  }
}

export function collectionToolbarSlotFillForRole(args: {
  collection: CollectionKind
  functionRole: FunctionRole
  systemRole: SystemRole
  capabilityOverrides?: Partial<Record<Capability, boolean>>
}): Record<CollectionToolbarSlotId, CollectionToolbarSlotFill> {
  return collectionToolbarSlotFill({
    collection: args.collection,
    canCreateReference: userCanCreateReference(
      args.functionRole,
      args.systemRole,
      args.capabilityOverrides,
    ),
    canCreateAccount: profileCanManageOrgData(args.systemRole, args.functionRole),
  })
}
