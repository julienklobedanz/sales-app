import { describe, expect, it } from 'vitest'
import { isIndustryId, resolveIndustryId } from './industries'

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
