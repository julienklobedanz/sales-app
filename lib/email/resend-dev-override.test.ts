import { afterEach, describe, expect, it } from 'vitest'

import {
  isResendSandboxRecipientError,
  resolveResendRecipient,
  shouldMockResendSend,
} from './resend-dev-override'

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

  it('detects resend sandbox recipient errors', () => {
    expect(
      isResendSandboxRecipientError(
        'You can only send testing emails to your own email address (test@example.com).'
      )
    ).toBe(true)
  })

  it('enables mock send in development when configured', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      RESEND_MOCK_SUCCESS: 'true',
    }
    expect(shouldMockResendSend()).toBe(true)
  })
})
