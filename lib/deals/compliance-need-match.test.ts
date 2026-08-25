import { describe, expect, it } from 'vitest'

import { complianceDocMatchesNeed } from './compliance-need-match'

describe('complianceDocMatchesNeed', () => {
  it('trifft Teilzeichenketten im Typ und Titel', () => {
    expect(
      complianceDocMatchesNeed(
        { document_type: 'iso_27001', title: 'Zertifikat 2026' },
        'ISO 27001',
      ),
    ).toBe(true)
  })

  it('trifft Wortstämme ab drei Zeichen', () => {
    expect(
      complianceDocMatchesNeed(
        { document_type: 'handelsregisterauszug', title: 'HRB 123' },
        'Handelsregister Auszug aktuell',
      ),
    ).toBe(true)
  })

  it('lehnt unpassende Belege ab', () => {
    expect(
      complianceDocMatchesNeed({ document_type: 'iso_9001', title: 'Qualität' }, 'TISAX'),
    ).toBe(false)
  })
})
