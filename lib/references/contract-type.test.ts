import { describe, expect, it } from 'vitest'

import { formatContractTypeDisplay, normalizeContractType } from './contract-type'

describe('formatContractTypeDisplay', () => {
  it('entfernt englische Klammerzusätze', () => {
    expect(formatContractTypeDisplay('Festpreis (Fixed Price)')).toBe('Festpreis')
  })

  it('mappt ältere englische Werte auf Deutsch', () => {
    expect(formatContractTypeDisplay('Usage-Based')).toBe('Nutzungsbasiert')
    expect(formatContractTypeDisplay('Subscription (Per User/Tiered)')).toBe(
      'Abo pro Nutzer / Staffel',
    )
    expect(formatContractTypeDisplay('Full Managed')).toBe('Komplett-Managed')
  })

  it('lässt deutsche Standardwerte unverändert', () => {
    expect(formatContractTypeDisplay('Festpreis')).toBe('Festpreis')
    expect(formatContractTypeDisplay('Time & Material')).toBe('Time & Material')
  })
})

describe('normalizeContractType', () => {
  it('normalisiert beim Speichern', () => {
    expect(normalizeContractType('Festpreis (Fixed Price)')).toBe('Festpreis')
    expect(normalizeContractType('   ')).toBeNull()
  })
})
