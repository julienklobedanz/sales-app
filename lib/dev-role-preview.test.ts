import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  canUseDevRolePreview,
  DEV_ROLE_PRESETS,
  formatDevRolePreviewCookie,
  formatDevRolePreviewLabel,
  isDevRolePreviewEnabled,
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

describe('isDevRolePreviewEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is disabled in production unless flag is 1', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    expect(isDevRolePreviewEnabled()).toBe(false)

    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW', '1')
    expect(isDevRolePreviewEnabled()).toBe(true)
  })

  it('is enabled in development unless flag is 0', () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    expect(isDevRolePreviewEnabled()).toBe(true)

    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW', '0')
    expect(isDevRolePreviewEnabled()).toBe(false)
  })
})

describe('canUseDevRolePreview', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows all roles in development when preview is enabled', () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    delete process.env.VERCEL_ENV
    expect(canUseDevRolePreview('member')).toBe(true)
    expect(canUseDevRolePreview('owner')).toBe(true)
  })

  it('allows all roles on local production start when flag is 1', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW', '1')
    delete process.env.VERCEL_ENV
    expect(canUseDevRolePreview('member')).toBe(true)
  })

  it('restricts Vercel production to owner and admin when flag is 1', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW', '1')
    expect(canUseDevRolePreview('owner')).toBe(true)
    expect(canUseDevRolePreview('admin')).toBe(true)
    expect(canUseDevRolePreview('member')).toBe(false)
    expect(canUseDevRolePreview('viewer')).toBe(false)
  })

  it('denies everyone when preview is disabled', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')
    delete process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW
    expect(canUseDevRolePreview('owner')).toBe(false)
    expect(canUseDevRolePreview('admin')).toBe(false)
  })
})

describe('formatDevRolePreviewLabel', () => {
  it('formats preset labels in German', () => {
    expect(
      formatDevRolePreviewLabel({ systemRole: 'member', functionRole: 'sales_rep' }),
    ).toContain('Vertrieb')
  })
})
