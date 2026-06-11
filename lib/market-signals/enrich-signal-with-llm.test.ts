import { describe, expect, it } from 'vitest'

import { buildHeuristicSignalEnrichment } from './enrich-signal-with-llm'

describe('buildHeuristicSignalEnrichment', () => {
  it('klassifiziert Executive-News als people', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Thomas Müller wird neuer CTO bei Siemens',
      companyName: 'Siemens',
      personName: 'Thomas Müller',
    })
    expect(result.is_relevant).toBe(true)
    expect(result.signal_category).toBe('people')
    expect(result.insight_signal_fact.length).toBeGreaterThan(10)
    expect(result.insight_why_now.length).toBeGreaterThan(20)
    expect(result.enrichment_source).toBe('heuristic')
  })

  it('klassifiziert Finanz-News als finance', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Siemens hebt Umsatzprognose für Q3 an',
      companyName: 'Siemens',
    })
    expect(result.signal_category).toBe('finance')
    expect(result.is_relevant).toBe(true)
  })

  it('klassifiziert Strategie-News als strategy', () => {
    const result = buildHeuristicSignalEnrichment({
      title: 'Siemens startet Cloud-Transformation der Kernsysteme',
      companyName: 'Siemens',
    })
    expect(result.signal_category).toBe('strategy')
  })
})
