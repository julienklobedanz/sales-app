import { describe, expect, it } from 'vitest'

import { MASTER_INDUSTRIES } from '@/lib/constants/industries'
import {
  buildIndustryPackRssQueries,
  buildPeoplePackRssQueries,
  getIndustrySourcePack,
  INDUSTRY_SOURCE_PACKS,
  isIndustryPackHost,
  isPeoplePackHost,
  PEOPLE_SOURCE_PACK,
} from './source-packs'

describe('source packs', () => {
  it('hat für jede Master-Industrie mindestens 10 Domains', () => {
    for (const industry of MASTER_INDUSTRIES) {
      const pack = getIndustrySourcePack(industry.id)
      expect(pack.length, industry.id).toBeGreaterThanOrEqual(10)
      expect(INDUSTRY_SOURCE_PACKS[industry.id]?.length ?? 0).toBeGreaterThanOrEqual(10)
    }
  })

  it('Personen-Pack hat Kern-Fachmedien', () => {
    expect(PEOPLE_SOURCE_PACK.length).toBeGreaterThanOrEqual(8)
    expect(PEOPLE_SOURCE_PACK.some((p) => p.domain === 'cio.de')).toBe(true)
  })

  it('baut Industry-Pack site:-Queries mit Firmennamen', () => {
    const qs = buildIndustryPackRssQueries('Allianz', 'fin')
    expect(qs.length).toBeGreaterThan(0)
    expect(qs[0]).toContain('"Allianz"')
    expect(qs[0]).toContain('site:versicherungsjournal.de')
    expect(qs.every((q) => q.includes('-Stellenanzeige'))).toBe(true)
  })

  it('baut People-Pack Queries', () => {
    const qs = buildPeoplePackRssQueries('Tim Cook', 'Apple')
    expect(qs.length).toBeGreaterThan(0)
    expect(qs[0]).toContain('"Tim Cook"')
    expect(qs[0]).toContain('"Apple"')
    expect(qs[0]).toContain('site:cio.de')
  })

  it('erkennt Pack-Hosts in URLs', () => {
    expect(isIndustryPackHost('https://www.lebensmittelzeitung.net/foo', 'ret')).toBe(true)
    expect(isIndustryPackHost('https://example.com/x', 'ret')).toBe(false)
    expect(isPeoplePackHost('https://www.cio.de/karriere/x')).toBe(true)
  })

  it('fällt ohne Branche auf other zurück', () => {
    const pack = getIndustrySourcePack(null)
    expect(pack.some((p) => p.domain === 'handelsblatt.com')).toBe(true)
  })
})
