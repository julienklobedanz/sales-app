import { describe, expect, it } from 'vitest'

import { profileCanManageOrgData, profileIsSalesRestricted } from './profile-guards'

describe('profileIsSalesRestricted', () => {
  it('treats sales_rep member as restricted', () => {
    expect(profileIsSalesRestricted('member', 'sales_rep')).toBe(true)
  })

  it('allows account_manager and admins', () => {
    expect(profileIsSalesRestricted('member', 'account_manager')).toBe(false)
    expect(profileIsSalesRestricted('admin', 'sales_leader')).toBe(false)
    expect(profileIsSalesRestricted('owner', 'sales_rep')).toBe(false)
  })
})

describe('profileCanManageOrgData', () => {
  it('allows admin and account manager for org management actions', () => {
    expect(profileCanManageOrgData('admin', 'sales_leader')).toBe(true)
    expect(profileCanManageOrgData('member', 'account_manager')).toBe(true)
  })

  it('denies plain sales_rep bulk-import style operations', () => {
    expect(profileCanManageOrgData('member', 'sales_rep')).toBe(false)
  })
})
