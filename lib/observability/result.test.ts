import { describe, expect, it } from 'vitest'

import { redactObject } from '@/lib/observability/logger'
import { fail, err, ok } from '@/lib/observability/result'

describe('redactObject', () => {
  it('redacts sensitive keys', () => {
    expect(redactObject({ userId: 'u1', api_key: 'secret' })).toEqual({
      userId: 'u1',
      api_key: '[redacted]',
    })
  })
})

describe('Result helpers', () => {
  it('ok/err shapes use success discriminant', () => {
    expect(ok()).toEqual({ success: true })
    expect(ok(1)).toEqual({ success: true, data: 1 })
    expect(err('nope')).toEqual({ success: false, error: 'nope' })
  })

  it('fail logs once and returns error result', () => {
    const result = fail('load failed', { action: 'test' }, new Error('boom'))
    expect(result).toEqual({ success: false, error: 'load failed' })
  })
})
