import { describe, expect, it } from 'vitest'

import {
  buildNewsroomCandidateUrls,
  buildStoredNewsroomRssQueries,
  isStoredNewsroomHost,
  normalizeWebsiteOrigin,
} from './discover-company-newsroom'

describe('normalizeWebsiteOrigin', () => {
  it('normalisiert Host ohne Protokoll', () => {
    expect(normalizeWebsiteOrigin('www.apple.com')).toBe('https://www.apple.com')
  })

  it('liefert null bei leerem Input', () => {
    expect(normalizeWebsiteOrigin('')).toBeNull()
    expect(normalizeWebsiteOrigin(null)).toBeNull()
  })
})

describe('buildNewsroomCandidateUrls', () => {
  it('baut Kandidaten-Pfade', () => {
    const urls = buildNewsroomCandidateUrls('https://aurubis.com')
    expect(urls.some((u) => u.endsWith('/newsroom'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/presse'))).toBe(true)
    expect(urls.every((u) => u.startsWith('https://aurubis.com/'))).toBe(true)
  })

  it('ohne Website leer', () => {
    expect(buildNewsroomCandidateUrls(null)).toEqual([])
  })
})

describe('buildStoredNewsroomRssQueries', () => {
  it('baut site:-Queries mit Pfad und Job-Ausschlüssen', () => {
    const qs = buildStoredNewsroomRssQueries('Aurubis', [
      'https://www.aurubis.com/de/presse',
    ])
    expect(qs.length).toBeGreaterThan(0)
    expect(qs.some((q) => q.includes('site:aurubis.com/de/presse'))).toBe(true)
    expect(qs.every((q) => q.includes('-Stellenanzeige'))).toBe(true)
    expect(qs.every((q) => q.includes('"Aurubis"'))).toBe(true)
  })

  it('leer ohne Name oder URLs', () => {
    expect(buildStoredNewsroomRssQueries('', ['https://a.com/presse'])).toEqual([])
    expect(buildStoredNewsroomRssQueries('Acme', [])).toEqual([])
  })
})

describe('isStoredNewsroomHost', () => {
  it('matched Host aus Newsroom-URL', () => {
    expect(
      isStoredNewsroomHost('https://www.aurubis.com/story', [
        'https://www.aurubis.com/de/presse',
      ]),
    ).toBe(true)
    expect(
      isStoredNewsroomHost('handelsblatt.com', ['https://www.aurubis.com/presse']),
    ).toBe(false)
  })
})
