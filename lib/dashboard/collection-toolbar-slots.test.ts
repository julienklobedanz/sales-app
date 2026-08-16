import { describe, expect, it } from 'vitest'

import { userCanCreateReference } from '@/lib/roles/reference-access'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'

import {
  COLLECTION_TOOLBAR_SLOT_IDS,
  collectionToolbarSlotFillForRole,
} from './collection-toolbar-slots'

const MEMBER: SystemRole = 'member'

const FIXTURES: { functionRole: FunctionRole; systemRole: SystemRole }[] = [
  { functionRole: 'sales_rep', systemRole: MEMBER },
  { functionRole: 'account_manager', systemRole: MEMBER },
  { functionRole: 'sales_leader', systemRole: 'admin' },
]

describe('collectionToolbarSlotFillForRole', () => {
  it('hält sechs Slots in fester Reihenfolge', () => {
    expect([...COLLECTION_TOOLBAR_SLOT_IDS]).toEqual([
      'collection-search',
      'collection-filter-primary',
      'collection-filter-more',
      'collection-view',
      'collection-primary',
      'collection-columns',
    ])
  })

  it('füllt Referenzen × sales_rep: primary leer, view gefüllt, Reihenfolge unverändert', () => {
    const fill = collectionToolbarSlotFillForRole({
      collection: 'references',
      functionRole: 'sales_rep',
      systemRole: MEMBER,
    })
    expect(userCanCreateReference('sales_rep', MEMBER)).toBe(false)
    expect(fill['collection-primary']).toBe('empty')
    expect(fill['collection-view']).toBe('filled')
    expect(Object.keys(fill)).toEqual([...COLLECTION_TOOLBAR_SLOT_IDS])
  })

  it('füllt Referenzen × account_manager und admin: primary gefüllt', () => {
    expect(
      collectionToolbarSlotFillForRole({
        collection: 'references',
        functionRole: 'account_manager',
        systemRole: MEMBER,
      })['collection-primary'],
    ).toBe('filled')
    expect(
      collectionToolbarSlotFillForRole({
        collection: 'references',
        functionRole: 'sales_rep',
        systemRole: 'admin',
      })['collection-primary'],
    ).toBe('filled')
  })

  it('füllt Deals × sales_rep: primary gefüllt, view leer', () => {
    const fill = collectionToolbarSlotFillForRole({
      collection: 'deals',
      functionRole: 'sales_rep',
      systemRole: MEMBER,
    })
    expect(fill['collection-primary']).toBe('filled')
    expect(fill['collection-view']).toBe('empty')
  })

  it('füllt Deals × AM/Admin: primary gefüllt, view leer', () => {
    for (const fixture of FIXTURES.filter((f) => f.functionRole !== 'sales_rep')) {
      const fill = collectionToolbarSlotFillForRole({
        collection: 'deals',
        ...fixture,
      })
      expect(fill['collection-primary']).toBe('filled')
      expect(fill['collection-view']).toBe('empty')
    }
  })
})
