import { describe, expect, it } from 'vitest'

import {
  contractEndPrimaryTone,
  formatContractEndRelativeLabel,
  isContractEndWithinWarningWindow,
} from './contract-end'

const now = new Date('2026-07-15T12:00:00Z')

describe('contract-end helpers', () => {
  it('detects warning window of 9 months', () => {
    expect(isContractEndWithinWarningWindow('2027-03-15', now)).toBe(true)
    expect(isContractEndWithinWarningWindow('2027-08-01', now)).toBe(false)
    expect(isContractEndWithinWarningWindow(null, now)).toBe(false)
  })

  it('maps urgency tone at 180 days', () => {
    expect(contractEndPrimaryTone('2026-10-01', now)).toBe('danger')
    expect(contractEndPrimaryTone('2027-03-15', now)).toBe('warning')
  })

  it('formats relative labels', () => {
    expect(formatContractEndRelativeLabel('2026-07-20', now)).toMatch(/Tagen/)
    expect(formatContractEndRelativeLabel('2027-03-15', now)).toMatch(/Monaten/)
  })
})
