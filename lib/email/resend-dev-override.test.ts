import { afterEach, describe, expect, it } from 'vitest'

import { resolveResendRecipient } from './resend-dev-override'

describe('resolveResendRecipient', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  it('redirects in development when override is set', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      RESEND_DEV_OVERRIDE_TO: 'dev@example.com',
    }
    const result = resolveResendRecipient('alex.stoepel@web.de')
    expect(result.to).toBe('dev@example.com')
    expect(result.devRedirected).toBe(true)
    expect(result.originalTo).toBe('alex.stoepel@web.de')
  })

  it('keeps intended recipient without override', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' }
    delete process.env.RESEND_DEV_OVERRIDE_TO
    const result = resolveResendRecipient('alex.stoepel@web.de')
    expect(result.to).toBe('alex.stoepel@web.de')
    expect(result.devRedirected).toBe(false)
  })
})
