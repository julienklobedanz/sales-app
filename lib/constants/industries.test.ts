import { describe, expect, it } from 'vitest'
import {
  formatIndustryDisplayCompact,
  isIndustryId,
  resolveIndustryId,
} from './industries'

describe('resolveIndustryId', () => {
  it('behält gültige ids', () => {
    expect(resolveIndustryId('tech')).toBe('tech')
    expect(isIndustryId('fin')).toBe(true)
  })

  it('mappt labelDe und Legacy', () => {
    expect(resolveIndustryId('Finanzdienstleistungen & Versicherung')).toBe('fin')
    expect(resolveIndustryId('Technologie, Medien & Telekommunikation')).toBe('tech')
    expect(resolveIndustryId('Technology, Media & Telecom (TMT)')).toBe('tech')
  })

  it('liefert leer für unbekannte Werte', () => {
    expect(resolveIndustryId('Automotive')).toBe('')
  })
})

describe('formatIndustryDisplayCompact', () => {
  it('kürzt vor dem Komma', () => {
    expect(formatIndustryDisplayCompact('health').compact).toBe('Gesundheitswesen')
    expect(formatIndustryDisplayCompact('health').full).toBe(
      'Gesundheitswesen, Life Sciences & Chemie',
    )
  })

  it('kürzt lange Ein-Wort-Cluster auf zwei Wörter', () => {
    const { compact, full } = formatIndustryDisplayCompact('fin')
    expect(full).toBe('Finanzdienstleistungen & Versicherung')
    expect(compact).toBe('Finanzdienstleistungen &…')
  })
})
