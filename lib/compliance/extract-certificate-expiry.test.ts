import { describe, expect, it } from 'vitest'

import { extractCertificateExpiryFromText } from '@/lib/compliance/extract-certificate-expiry'

describe('extractCertificateExpiryFromText', () => {
  it('erkennt deutsches Gültig-bis-Datum', () => {
    const result = extractCertificateExpiryFromText(
      'Dieses Zertifikat ist gültig bis 12.12.2027 und wurde ausgestellt von TÜV.',
      new Date('2026-05-30')
    )
    expect(result.validUntil).toBe('2027-12-12')
    expect(result.confidence).not.toBe('none')
  })

  it('erkennt englisches expiry date', () => {
    const result = extractCertificateExpiryFromText(
      'Certificate expiry date: 31/03/2028. Scope: Information Security.',
      new Date('2026-01-01')
    )
    expect(result.validUntil).toBe('2028-03-31')
  })

  it('erkennt ISO-Datum nach Valid until', () => {
    const result = extractCertificateExpiryFromText(
      'Valid until 2029-06-15 for the certified management system.',
      new Date('2026-01-01')
    )
    expect(result.validUntil).toBe('2029-06-15')
  })

  it('bevorzugt Datum nahe Ablauf-Keyword', () => {
    const result = extractCertificateExpiryFromText(
      'Issued on 01.01.2020. Expiry date 15.09.2027. Revision 2024.',
      new Date('2026-01-01')
    )
    expect(result.validUntil).toBe('2027-09-15')
  })

  it('liefert null ohne Treffer', () => {
    const result = extractCertificateExpiryFromText('Nur Fließtext ohne Datum.', new Date('2026-01-01'))
    expect(result.validUntil).toBeNull()
    expect(result.confidence).toBe('none')
  })
})
