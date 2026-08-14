import { describe, expect, it } from 'vitest'

import { statusTone } from '@/lib/ui/status-tone'

import { dealStatusTone } from './deal-status-badge'

describe('dealStatusTone', () => {
  it('maps RFP to info and negotiation to warning', () => {
    expect(dealStatusTone('rfp')).toBe(statusTone.info)
    expect(dealStatusTone('negotiation')).toBe(statusTone.warning)
  })
})
