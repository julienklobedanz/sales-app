import { describe, expect, it } from 'vitest'

import { isRfpDeal } from './is-rfp-deal'

describe('isRfpDeal', () => {
  it('true when is_rfp_mode is set', () => {
    expect(isRfpDeal({ is_rfp_mode: true })).toBe(true)
  })

  it('false when is_rfp_mode is unset', () => {
    expect(isRfpDeal({ is_rfp_mode: false })).toBe(false)
  })
})
