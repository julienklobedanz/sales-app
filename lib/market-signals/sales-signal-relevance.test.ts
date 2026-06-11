import { describe, expect, it } from 'vitest'

import {
  buildSalesFocusedCompanyNewsRssQuery,
  hasSalesTriggerHint,
  isLowValueRssTitle,
  isRssPubDateWithinDays,
} from './sales-signal-relevance'

describe('isLowValueRssTitle', () => {
  it('erkennt Stellenanzeigen', () => {
    expect(isLowValueRssTitle('Bauingenieur Industriebau (m/w/d) (Lünen) - Aurubis')).toBe(true)
    expect(isLowValueRssTitle('Koordinator Legal Operations (m/w/d) - Aurubis')).toBe(true)
    expect(isLowValueRssTitle('Instandhaltung, Anlagentechnik & Facility Management - Aurubis')).toBe(
      true
    )
  })

  it('lässt strategische News durch', () => {
    expect(
      isLowValueRssTitle('Aurubis und NKT festigen Partnerschaft mit mehrjährigem Liefervertrag')
    ).toBe(false)
    expect(isLowValueRssTitle('Siemens eröffnet neues Werk in Bayern')).toBe(false)
  })
})

describe('hasSalesTriggerHint', () => {
  it('erkennt Expansion und Führungswechsel', () => {
    expect(hasSalesTriggerHint('Apple eröffnet neues Logistikzentrum in München')).toBe(true)
    expect(hasSalesTriggerHint('Neuer CTO bei Conrad ernannt')).toBe(true)
  })
})

describe('isRssPubDateWithinDays', () => {
  it('filtert alte Artikel', () => {
    const old = new Date(Date.now() - 40 * 86_400_000)
    expect(isRssPubDateWithinDays(old, 30)).toBe(false)
    const recent = new Date(Date.now() - 2 * 86_400_000)
    expect(isRssPubDateWithinDays(recent, 30)).toBe(true)
  })
})

describe('buildSalesFocusedCompanyNewsRssQuery', () => {
  it('enthält Ausschlüsse für Jobs', () => {
    const q = buildSalesFocusedCompanyNewsRssQuery('Aurubis', 'aurubis.com')
    expect(q).toContain('-Stellenanzeige')
    expect(q).toContain('Aurubis')
  })
})
