import { describe, expect, it } from 'vitest'

import {
  benchmarkRiskTone,
  benchmarkRiskValueClass,
  buildBenchmarkRiskAnalysis,
  computeBenchmarkRiskScore,
  topBenchmarkRiskTooltipHits,
} from '@/lib/deal-desk/benchmark-risk'

describe('benchmark risk score', () => {
  it('sums weights and caps at 100%', () => {
    const hits = [
      { id: 'no_contact_rule' as const },
      { id: 'incumbent_spec_sheet' as const },
      { id: 'aggressive_deadline' as const },
    ]
    expect(computeBenchmarkRiskScore(hits)).toBe(80)
    expect(
      computeBenchmarkRiskScore([
        { id: 'no_contact_rule' },
        { id: 'incumbent_spec_sheet' },
        { id: 'aggressive_deadline' },
        { id: 'extreme_price_focus' },
      ]),
    ).toBe(100)
  })

  it('deduplicates criteria', () => {
    expect(
      computeBenchmarkRiskScore([
        { id: 'budgetary_quote_only' },
        { id: 'budgetary_quote_only' },
      ]),
    ).toBe(10)
  })

  it('assigns color tones by threshold', () => {
    expect(benchmarkRiskTone(10)).toBe('low')
    expect(benchmarkRiskTone(45)).toBe('medium')
    expect(benchmarkRiskTone(70)).toBe('high')
    expect(benchmarkRiskValueClass('low')).toBe('text-green-600')
    expect(benchmarkRiskValueClass('medium')).toBe('text-amber-500')
    expect(benchmarkRiskValueClass('high')).toBe('text-red-600')
  })

  it('returns top weighted tooltip hits', () => {
    const analysis = buildBenchmarkRiskAnalysis([
      { id: 'budgetary_quote_only' },
      { id: 'no_contact_rule' },
      { id: 'recycled_old_document' },
      { id: 'aggressive_deadline' },
    ])
    const top = topBenchmarkRiskTooltipHits(analysis.hits, 2)
    expect(top.map((h) => h.id)).toEqual(['no_contact_rule', 'aggressive_deadline'])
  })
})
