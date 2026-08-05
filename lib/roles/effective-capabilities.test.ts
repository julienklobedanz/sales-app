import { describe, expect, it } from 'vitest'

import type { Capability } from '@/lib/roles/capabilities'
import {
  effectiveCapabilities,
  hasCapability,
} from '@/lib/roles/capability-access'
import {
  legacyAppRoleFrom,
  legacyRoleToDimensions,
} from '@/lib/roles/legacy-mapping'

describe('legacyRoleToDimensions', () => {
  it('maps admin to admin + sales_leader', () => {
    expect(legacyRoleToDimensions('admin')).toEqual({
      systemRole: 'admin',
      functionRole: 'sales_leader',
    })
  })

  it('maps account_manager to member + account_manager', () => {
    expect(legacyRoleToDimensions('account_manager')).toEqual({
      systemRole: 'member',
      functionRole: 'account_manager',
    })
  })
})

describe('legacyAppRoleFrom', () => {
  it('derives legacy admin from owner', () => {
    expect(legacyAppRoleFrom('owner', 'sales_rep')).toBe('admin')
  })

  it('derives account_manager from function role', () => {
    expect(legacyAppRoleFrom('member', 'account_manager')).toBe('account_manager')
  })
})

describe('effectiveCapabilities', () => {
  it('unions function and admin caps for owner', () => {
    const caps = effectiveCapabilities('sales_rep', 'owner')
    expect(caps.has('view_analytics_own')).toBe(true)
    expect(caps.has('manage_team')).toBe(true)
    expect(caps.has('manage_reference_program')).toBe(false)
  })

  it('gives sales_leader analytics without admin team caps', () => {
    const caps = effectiveCapabilities('sales_leader', 'member')
    expect(caps.has('view_analytics_all')).toBe(true)
    expect(caps.has('manage_team')).toBe(false)
  })

  it('applies overrides', () => {
    const caps = effectiveCapabilities('sales_rep', 'member', {
      manage_reference_program: true,
      view_analytics_own: false,
    } as Partial<Record<Capability, boolean>>)
    expect(caps.has('manage_reference_program')).toBe(true)
    expect(caps.has('view_analytics_own')).toBe(false)
  })

  it('hasCapability delegates to effective set', () => {
    expect(hasCapability('sales_rep', 'admin', {}, 'manage_settings')).toBe(true)
  })
})
