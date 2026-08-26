import { describe, expect, it } from 'vitest'

import { COPY } from '@/lib/copy'
import type { EligibilityAssessment } from '@/lib/deals/eligibility-criteria-schema'

import { buildDealWorkspaceTiles } from './build-deal-workspace-tiles'

function assessment(
  overrides: Partial<EligibilityAssessment> &
    Pick<EligibilityAssessment, 'verdict' | 'criteria'>,
): EligibilityAssessment {
  return { summary: '', ...overrides }
}

const criterion = {
  id: 'c1',
  dimension: 'employee_count' as const,
  label: 'Mitarbeiter',
  operator: 'gte' as const,
  value: 10,
  mandatory: true,
  confidence: 'high' as const,
  status: 'unknown' as const,
  detail: '',
  basis: 'numeric' as const,
}

describe('buildDealWorkspaceTiles', () => {
  it('zeigt vor der Analyse überall „noch nicht analysiert“, nie 0', () => {
    const tiles = buildDealWorkspaceTiles({
      dealId: 'd1',
      documentCount: 2,
      data: null,
    })
    expect(tiles.map((t) => t.area)).toEqual([
      'dokumente',
      'anforderungen',
      'eignung',
      'risiken',
      'entwuerfe',
    ])
    expect(
      tiles.every((t) => t.state === COPY.deals.cockpit.workspaceTileNotAnalyzed),
    ).toBe(true)
  })

  it('behandelt stale Analyse wie nicht analysiert', () => {
    const tiles = buildDealWorkspaceTiles({
      dealId: 'd1',
      documentCount: 1,
      data: {
        hasAnalysis: true,
        isStale: true,
        eligibilityAssessment: null,
        draftRows: [],
        requirementsCount: 4,
      },
    })
    expect(
      tiles.every((t) => t.state === COPY.deals.cockpit.workspaceTileNotAnalyzed),
    ).toBe(true)
  })

  it('zeigt nach Analyse Behälterzahlen, Entwürfe getrennt, Risiken ohne Zahl', () => {
    const tiles = buildDealWorkspaceTiles({
      dealId: 'd1',
      documentCount: 3,
      data: {
        hasAnalysis: true,
        isStale: false,
        eligibilityAssessment: assessment({
          verdict: 'unknown',
          criteria: [
            { ...criterion, status: 'unknown' },
            { ...criterion, id: 'c2', status: 'unknown' },
          ],
        }),
        draftRows: [
          { reference: { id: 'r1' }, answer: 'fertig' },
          { reference: { id: 'r2' } },
          { reference: null },
          {},
        ],
        requirementsCount: 12,
      },
    })
    const byArea = Object.fromEntries(tiles.map((t) => [t.area, t]))
    expect(byArea.dokumente.state).toBe('3 Dokumente')
    expect(byArea.anforderungen.state).toBe('12 Anforderungen')
    expect(byArea.eignung.state).toBe('2 Kriterien ohne Profildaten')
    expect(byArea.risiken.state).toBeNull()
    expect(byArea.entwuerfe.state).toBe('2 ohne Beleg · 1 ohne Text')
  })

  it('zeigt bei K.O. die K.O.-Zahl, nicht 0 ohne Profildaten', () => {
    const tiles = buildDealWorkspaceTiles({
      dealId: 'd1',
      documentCount: 1,
      data: {
        hasAnalysis: true,
        isStale: false,
        eligibilityAssessment: assessment({
          verdict: 'ko',
          criteria: [
            { ...criterion, status: 'not_met' },
            { ...criterion, id: 'c2', status: 'met' },
          ],
        }),
        draftRows: [{ reference: { id: 'r1' }, answer: 'ok' }],
        requirementsCount: 0,
      },
    })
    const eignung = tiles.find((t) => t.area === 'eignung')
    expect(eignung?.state).toBe('1 Pflichtkriterium nicht erfüllt')
    expect(eignung?.state).not.toContain('ohne Profildaten')
    expect(tiles.find((t) => t.area === 'entwuerfe')?.state).toBe('0 Entwürfe offen')
    expect(tiles.find((t) => t.area === 'anforderungen')?.state).toBe('0 Anforderungen')
  })

  it('trennt Unbekannt in ohne Profildaten und nicht erkannt', () => {
    const tiles = buildDealWorkspaceTiles({
      dealId: 'd1',
      documentCount: 1,
      data: {
        hasAnalysis: true,
        isStale: false,
        eligibilityAssessment: assessment({
          verdict: 'unknown',
          criteria: [
            { ...criterion, status: 'unknown', basis: 'numeric' },
            {
              ...criterion,
              id: 'c2',
              dimension: 'certification',
              status: 'unknown',
              basis: 'text',
            },
            {
              ...criterion,
              id: 'c3',
              dimension: 'region',
              status: 'unknown',
              basis: 'text',
            },
          ],
        }),
        draftRows: [],
        requirementsCount: 0,
      },
    })
    expect(tiles.find((t) => t.area === 'eignung')?.state).toBe(
      '1 Kriterium ohne Profildaten · 2 Kriterien nicht erkannt',
    )
  })

  it('zeigt bei nur Text-Unbekannt „nicht erkannt“, ohne Profildaten weglassen', () => {
    const tiles = buildDealWorkspaceTiles({
      dealId: 'd1',
      documentCount: 1,
      data: {
        hasAnalysis: true,
        isStale: false,
        eligibilityAssessment: assessment({
          verdict: 'unknown',
          criteria: [
            {
              ...criterion,
              dimension: 'certification',
              status: 'unknown',
              basis: 'text',
            },
          ],
        }),
        draftRows: [],
        requirementsCount: 0,
      },
    })
    expect(tiles.find((t) => t.area === 'eignung')?.state).toBe('1 Kriterium nicht erkannt')
  })
})
