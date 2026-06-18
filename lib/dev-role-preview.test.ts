import { afterEach, describe, expect, it } from 'vitest'

import {
  DEV_ROLE_PRESETS,
  formatDevRolePreviewCookie,
  isDevRolePreviewEnabled,
  parseAppRoleCookie,
  parseDevRolePreviewCookie,
} from './dev-role-preview'

describe('parseDevRolePreviewCookie', () => {
  it('accepts system:function format', () => {
    expect(parseDevRolePreviewCookie('admin:sales_rep')).toEqual({
      systemRole: 'admin',
      functionRole: 'sales_rep',
    })
    expect(parseDevRolePreviewCookie('member:account_manager')).toEqual({
      systemRole: 'member',
      functionRole: 'account_manager',
    })
  })

  it('accepts legacy single-role cookies', () => {
    expect(parseDevRolePreviewCookie('admin')).toEqual({
      systemRole: 'admin',
      functionRole: 'sales_leader',
    })
    expect(parseDevRolePreviewCookie('account_manager')).toEqual({
      systemRole: 'member',
      functionRole: 'account_manager',
    })
    expect(parseDevRolePreviewCookie('sales')).toEqual({
      systemRole: 'member',
      functionRole: 'sales_rep',
    })
  })

  it('rejects unknown values', () => {
    expect(parseDevRolePreviewCookie('')).toBeNull()
    expect(parseDevRolePreviewCookie('superadmin:sales_rep')).toBeNull()
    expect(parseDevRolePreviewCookie('admin:unknown')).toBeNull()
  })
})

describe('formatDevRolePreviewCookie', () => {
  it('round-trips with parse', () => {
    for (const preset of DEV_ROLE_PRESETS) {
      const cookie = formatDevRolePreviewCookie(preset)
      expect(parseDevRolePreviewCookie(cookie)).toEqual(preset)
    }
  })
})

describe('parseAppRoleCookie (deprecated)', () => {
  it('accepts known roles', () => {
    expect(parseAppRoleCookie('admin')).toBe('admin')
    expect(parseAppRoleCookie('sales')).toBe('sales')
    expect(parseAppRoleCookie('account_manager')).toBe('account_manager')
  })

  it('rejects unknown values', () => {
    expect(parseAppRoleCookie('')).toBeNull()
    expect(parseAppRoleCookie('superadmin')).toBeNull()
  })
})

describe('isDevRolePreviewEnabled', () => {
  const prevNodeEnv = process.env.NODE_ENV
  const prevFlag = process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv
    if (prevFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    } else {
      process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW = prevFlag
    }
  })

  it('is disabled in production unless flag is 1', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    expect(isDevRolePreviewEnabled()).toBe(false)

    process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW = '1'
    expect(isDevRolePreviewEnabled()).toBe(true)
  })

  it('is enabled in development unless flag is 0', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    expect(isDevRolePreviewEnabled()).toBe(true)

    process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW = '0'
    expect(isDevRolePreviewEnabled()).toBe(false)
  })
})
