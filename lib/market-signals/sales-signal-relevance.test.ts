import { describe, expect, it } from 'vitest'

import {
  buildNewsroomRssQueries,
  buildSalesFocusedCompanyNewsRssQuery,
  hasSalesTriggerHint,
  isLowValueRssTitle,
  isRssPubDateWithinDays,
  RSS_MAX_AGE_DAYS_LEADERSHIP,
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

  it('filtert Sport, Entertainment und Safety-Sheets', () => {
    expect(isLowValueRssTitle('Apple stellt mit 89 Emmy Award Nominierungen einen neuen Rekord auf')).toBe(
      true
    )
    expect(isLowValueRssTitle('Madden NFL 27 Arcade Edition auf Apple Arcade')).toBe(true)
    expect(isLowValueRssTitle('Sicherheitsdatenblatt - download.basf.com')).toBe(true)
    expect(isLowValueRssTitle('Newsroom - Aurubis')).toBe(true)
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

describe('buildNewsroomRssQueries', () => {
  it('baut site:-Queries für Newsroom/Presse', () => {
    const qs = buildNewsroomRssQueries('Apple', 'apple.com')
    expect(qs.some((q) => q.includes('site:apple.com'))).toBe(true)
    expect(qs.some((q) => /newsroom|presse|press/i.test(q))).toBe(true)
  })

  it('ohne Host leer', () => {
    expect(buildNewsroomRssQueries('Apple', null)).toEqual([])
  })
})

describe('RSS_MAX_AGE_DAYS_LEADERSHIP', () => {
  it('liegt im Fenster 90–180 Tage', () => {
    expect(RSS_MAX_AGE_DAYS_LEADERSHIP).toBeGreaterThanOrEqual(90)
    expect(RSS_MAX_AGE_DAYS_LEADERSHIP).toBeLessThanOrEqual(180)
  })
})
