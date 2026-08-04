import { describe, expect, it } from 'vitest'

import { getReferenceVisibilityScope } from '@/lib/roles/reference-visibility-scope'

describe('getReferenceVisibilityScope', () => {
  it('restricts sales_rep without org overrides', () => {
    const scope = getReferenceVisibilityScope({
      systemRole: 'member',
      functionRole: 'sales_rep',
    })
    expect(scope.restrictToSalesVisibleStatuses).toBe(true)
  })

  it('does not restrict account_manager', () => {
    const scope = getReferenceVisibilityScope({
      systemRole: 'member',
      functionRole: 'account_manager',
    })
    expect(scope.restrictToSalesVisibleStatuses).toBe(false)
  })

  it('does not restrict admin', () => {
    const scope = getReferenceVisibilityScope({
      systemRole: 'admin',
      functionRole: 'sales_leader',
    })
    expect(scope.restrictToSalesVisibleStatuses).toBe(false)
  })

  it('opens drafts for sales_rep when B4 org flag is set', () => {
    const scope = getReferenceVisibilityScope({
      systemRole: 'member',
      functionRole: 'sales_rep',
      orgRolesPermissions: { sales_sees_drafts: true },
    })
    expect(scope.restrictToSalesVisibleStatuses).toBe(false)
  })

  it('respects profile capability override', () => {
    const restricted = getReferenceVisibilityScope({
      systemRole: 'member',
      functionRole: 'account_manager',
      capabilityOverrides: {
        see_draft_references: false,
        see_confidential_references: false,
      },
    })
    expect(restricted.restrictToSalesVisibleStatuses).toBe(true)

    const open = getReferenceVisibilityScope({
      systemRole: 'member',
      functionRole: 'sales_rep',
      capabilityOverrides: { see_confidential_references: true },
    })
    expect(open.restrictToSalesVisibleStatuses).toBe(false)
  })
})
