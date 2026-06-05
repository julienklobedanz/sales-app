import { afterEach, describe, expect, it } from 'vitest'

import { isDevRolePreviewEnabled, parseAppRoleCookie } from './dev-role-preview'

describe('parseAppRoleCookie', () => {
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
