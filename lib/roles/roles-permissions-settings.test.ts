import { describe, expect, it } from 'vitest'

import {
  effectiveCapabilitiesWithOrg,
  parseRolesPermissionsSettings,
} from '@/lib/roles/roles-permissions-settings'

describe('parseRolesPermissionsSettings', () => {
  it('parses B4 and capability matrix', () => {
    const parsed = parseRolesPermissionsSettings({
      sales_sees_drafts: true,
      function_role_capabilities: {
        sales_rep: ['see_confidential_references'],
      },
      approval_routing: { mode: 'via_rpm' },
    })
    expect(parsed.sales_sees_drafts).toBe(true)
    expect(parsed.function_role_capabilities?.sales_rep).toEqual([
      'see_confidential_references',
    ])
    expect(parsed.approval_routing?.mode).toBe('via_rpm')
  })
})

describe('effectiveCapabilitiesWithOrg', () => {
  it('adds see_draft_references for sales_rep when B4 enabled', () => {
    const caps = effectiveCapabilitiesWithOrg(
      'sales_rep',
      'member',
      {},
      { sales_sees_drafts: true },
    )
    expect(caps.has('see_draft_references')).toBe(true)
  })

  it('uses org function role capability overrides', () => {
    const caps = effectiveCapabilitiesWithOrg(
      'sales_rep',
      'member',
      {},
      {
        function_role_capabilities: {
          sales_rep: ['see_confidential_references'],
        },
      },
    )
    expect(caps.has('see_confidential_references')).toBe(true)
    expect(caps.has('see_draft_references')).toBe(false)
  })
})
