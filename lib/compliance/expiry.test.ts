import { describe, expect, it } from 'vitest'

import {
  COMPLIANCE_EXPIRY_WARNING_DAYS,
  complianceValidityStatus,
  isComplianceDocumentExpired,
} from './expiry'

describe('complianceValidityStatus', () => {
  const ref = new Date('2026-08-24T10:00:00')

  it('nutzt dasselbe 30-Tage-Fenster wie NDA', () => {
    expect(COMPLIANCE_EXPIRY_WARNING_DAYS).toBe(30)
  })

  it('unbefristet ist gültig', () => {
    expect(complianceValidityStatus(null, ref)).toBe('valid')
    expect(complianceValidityStatus(undefined, ref)).toBe('valid')
    expect(isComplianceDocumentExpired(null, ref)).toBe(false)
  })

  it('unterscheidet gültig, läuft ab und abgelaufen', () => {
    expect(complianceValidityStatus('2026-09-24', ref)).toBe('valid')
    expect(complianceValidityStatus('2026-09-23', ref)).toBe('expiring')
    expect(complianceValidityStatus('2026-08-24', ref)).toBe('expiring')
    expect(complianceValidityStatus('2026-08-23', ref)).toBe('expired')
    expect(isComplianceDocumentExpired('2026-08-23', ref)).toBe(true)
    expect(isComplianceDocumentExpired('2026-09-23', ref)).toBe(false)
  })
})
