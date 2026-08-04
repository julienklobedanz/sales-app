import { describe, expect, it } from 'vitest'

import {
  buildHeuristicSignalEnrichment,
  parseLlmEnrichmentJson,
} from './enrich-signal-with-llm'

describe('buildHeuristicSignalEnrichment', () => {
  it('klassifiziert Executive-News als people ohne Cloud-Pitch', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Thomas Müller wird neuer CTO bei Siemens',
      companyName: 'Siemens',
      personName: 'Thomas Müller',
    })
    expect(result.is_relevant).toBe(true)
    expect(result.signal_category).toBe('people')
    expect(result.insight_signal_fact.length).toBeGreaterThan(10)
    expect(result.insight_why_now.length).toBeGreaterThan(10)
    expect(result.insight_why_now).not.toMatch(/Cloud-Infrastruktur/i)
    expect(result.enrichment_source).toBe('heuristic')
  })

  it('klassifiziert Finanz-News als finance', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Siemens hebt Umsatzprognose für Q3 an',
      companyName: 'Siemens',
    })
    expect(result.signal_category).toBe('finance')
    expect(result.is_relevant).toBe(true)
    expect(result.insight_why_now).not.toMatch(/Business Case für unsere/i)
  })

  it('klassifiziert Strategie-News als strategy', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Siemens startet Cloud-Transformation der Kernsysteme',
      companyName: 'Siemens',
    })
    expect(result.signal_category).toBe('strategy')
  })

  it('nutzt Snippet für Why-now wenn vorhanden', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Aurubis erweitert Recycling-Kapazität',
      companyName: 'Aurubis',
      snippet: 'Das Unternehmen investiert in eine neue Anlage in Hamburg.',
    })
    expect(result.insight_why_now.length).toBeGreaterThan(20)
  })
})

describe('parseLlmEnrichmentJson', () => {
  it('akzeptiert flaches Schema', () => {
    const parsed = parseLlmEnrichmentJson(
      JSON.stringify({
        is_relevant: true,
        signal_category: 'people',
        insight_signal_fact: 'Tim Cook tritt als CEO zurück.',
        insight_why_now:
          'Führungswechsel bei Apple öffnet ein neues Entscheidungsfenster.',
      }),
      'strategy',
    )
    expect(parsed?.insight_why_now).toContain('Führungswechsel')
    expect(parsed?.signal_category).toBe('people')
  })

  it('akzeptiert nested insight.why_now als Fallback', () => {
    const parsed = parseLlmEnrichmentJson(
      JSON.stringify({
        is_relevant: true,
        signal_category: 'finance',
        insight: {
          signal_fact: 'Quartalszahlen besser als erwartet.',
          why_now: 'Bessere Zahlen erhöhen den Investitionsdruck im IT-Budget.',
        },
      }),
      'strategy',
    )
    expect(parsed?.insight_signal_fact).toContain('Quartalszahlen')
    expect(parsed?.insight_why_now).toContain('Investitionsdruck')
  })
})
