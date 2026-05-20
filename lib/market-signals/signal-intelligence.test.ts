import { describe, expect, it } from 'vitest'

import {
  buildMarketSignalIntelligence,
  buildReferenceInsightLine,
  classifyRoleTransition,
  formatRoleChangeFact,
  titleSeniorityScore,
} from './signal-intelligence'

describe('titleSeniorityScore', () => {
  it('ranks C-level above director', () => {
    expect(titleSeniorityScore('CEO')).toBeGreaterThan(titleSeniorityScore('Director IT'))
    expect(titleSeniorityScore('CTO')).toBeGreaterThan(titleSeniorityScore('Head of IT'))
  })
})

describe('classifyRoleTransition', () => {
  it('flags CEO to CTO as step down', () => {
    const t = classifyRoleTransition('CEO', 'CTO', 'wurde CEO → jetzt CTO gewechselt')
    expect(t.kind).toBe('step_down')
    expect(t.is_step_down).toBe(true)
  })

  it('treats head of IT to CTO as promotion', () => {
    const t = classifyRoleTransition('Head of IT', 'CTO', '')
    expect(t.kind).toBe('promotion')
    expect(t.is_step_down).toBe(false)
  })
})

describe('formatRoleChangeFact', () => {
  it('replaces illogical CEO→CTO copy with warning', () => {
    const line = formatRoleChangeFact({
      personName: 'Thomas Müller',
      personTitleBefore: 'CEO',
      personTitleAfter: 'CTO',
      companyName: 'Apple',
      changeSummary: 'wurde CEO → jetzt CTO gewechselt',
    })
    expect(line).toContain('⚠️')
    expect(line).not.toMatch(/wurde CEO/i)
  })

  it('formats CPO to CTO as promotion', () => {
    const line = formatRoleChangeFact({
      personName: 'Thomas Müller',
      personTitleBefore: 'CPO',
      personTitleAfter: 'CTO',
      companyName: 'Apple',
    })
    expect(line).toContain('wechselt von CPO auf den CTO')
    expect(line).not.toContain('⚠️')
  })
})

describe('buildReferenceInsightLine', () => {
  it('does not claim visible refs when only pool exists and filter is on', () => {
    const line = buildReferenceInsightLine({
      references: [
        { id: '1', title: 'A', status: 'pending' },
        { id: '2', title: 'B', status: 'draft' },
      ],
      onlyApprovedReferences: true,
    })
    expect(line).toBe(
      '2 Referenzen verfügbar — jedoch hat noch keine von diesen die Freigabe für externe Nutzung.'
    )
  })

  it('returns null for empty pool', () => {
    expect(
      buildReferenceInsightLine({ references: [], onlyApprovedReferences: true })
    ).toBeNull()
  })
})

describe('buildMarketSignalIntelligence', () => {
  it('includes warm_intro action trigger', () => {
    const intel = buildMarketSignalIntelligence({
      signalKind: 'exec',
      personName: 'Thomas Müller',
      companyName: 'Apple',
      personTitleBefore: 'CPO',
      personTitleAfter: 'CTO',
      references: [],
      onlyApprovedReferences: true,
      primaryStakeholder: { fullName: 'Lena Hoffmann', title: 'CIO' },
      warmIntro: { colleagueName: 'Markus Weber', stakeholderName: 'Lena Hoffmann' },
    })
    expect(intel.action_triggers.some((t) => t.type === 'warm_intro')).toBe(true)
    expect(intel.action_triggers.some((t) => t.type === 'direct_outreach')).toBe(true)
    expect(intel.insight.why_now).not.toMatch(/Momentum|lösungsorientiert/i)
  })
})
