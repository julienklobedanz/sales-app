import { describe, expect, it } from 'vitest'

import {
  compareEligibilityCriteria,
  isCapabilityProfileEmpty,
} from '@/lib/deals/compare-eligibility-criteria'
import { parseEligibilityCriteriaResponse } from '@/lib/deals/eligibility-criteria-schema'
import type { EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'

const DEMO_FIXTURE_JSON = {
  criteria: [
    {
      id: 'min-employees',
      dimension: 'employee_count',
      label: 'Mindestens 500 Mitarbeiter',
      operator: 'gte',
      value: 500,
      unit: 'MA',
      mandatory: true,
      confidence: 'high',
      evidence: 'Bieter müssen mindestens 500 Mitarbeiter beschäftigen.',
    },
    {
      id: 'min-revenue',
      dimension: 'annual_revenue',
      label: 'Jahresumsatz ≥ 50 Mio EUR',
      operator: 'gte',
      value: 50_000_000,
      mandatory: true,
      confidence: 'high',
    },
    {
      id: 'iso-consultants',
      dimension: 'certification',
      label: 'ISO 27001 zertifizierte Berater',
      operator: 'gte',
      value: 'ISO 27001',
      mandatory: true,
      confidence: 'medium',
    },
  ],
}

function criterion(partial: Partial<EligibilityCriterion> & Pick<EligibilityCriterion, 'dimension' | 'label' | 'value'>): EligibilityCriterion {
  return {
    id: partial.id ?? 'test',
    operator: partial.operator ?? 'gte',
    mandatory: partial.mandatory ?? true,
    confidence: partial.confidence ?? 'high',
    ...partial,
  }
}

describe('parseEligibilityCriteriaResponse', () => {
  it('parses demo-RFP fixture with quantified thresholds', () => {
    const criteria = parseEligibilityCriteriaResponse(DEMO_FIXTURE_JSON)
    expect(criteria).toHaveLength(3)
    expect(criteria[0]?.dimension).toBe('employee_count')
    expect(criteria[0]?.value).toBe(500)
    expect(criteria[1]?.value).toBe(50_000_000)
  })

  it('ignores invalid entries and caps list', () => {
    const criteria = parseEligibilityCriteriaResponse({
      criteria: [{ dimension: 'invalid', label: 'x', value: 1 }, null, 'bad'],
    })
    expect(criteria).toHaveLength(0)
  })

  it('defaults confidence to medium when missing', () => {
    const criteria = parseEligibilityCriteriaResponse({
      criteria: [{ dimension: 'employee_count', label: 'MA', operator: 'gte', value: 10 }],
    })
    expect(criteria[0]?.confidence).toBe('medium')
  })
})

describe('compareEligibilityCriteria', () => {
  const demoCriteria = parseEligibilityCriteriaResponse(DEMO_FIXTURE_JSON)

  it('empty profile → all unknown, verdict unknown (never silent eligible)', () => {
    const assessment = compareEligibilityCriteria(demoCriteria, {
      profile: {},
      complianceDocs: [],
      referenceCount: 20,
    })
    expect(isCapabilityProfileEmpty({})).toBe(true)
    expect(assessment.verdict).toBe('unknown')
    expect(assessment.criteria.every((c) => c.status === 'unknown')).toBe(true)
  })

  it('profile meets employee + revenue thresholds → eligible when certs present', () => {
    const assessment = compareEligibilityCriteria(demoCriteria, {
      profile: {
        employeeCount: 600,
        annualRevenueEur: 80_000_000,
        certifiedRoles: [{ role: 'ISO 27001 Berater', count: 5 }],
      },
      complianceDocs: [],
      referenceCount: 10,
    })
    expect(assessment.criteria[0]?.status).toBe('met')
    expect(assessment.criteria[1]?.status).toBe('met')
    expect(assessment.verdict).toBe('eligible')
  })

  it('high-confidence mandatory not_met → K.O.', () => {
    const assessment = compareEligibilityCriteria(demoCriteria, {
      profile: {
        employeeCount: 200,
        annualRevenueEur: 80_000_000,
      },
      complianceDocs: [],
      referenceCount: 10,
    })
    expect(assessment.criteria[0]?.status).toBe('not_met')
    expect(assessment.verdict).toBe('ko')
  })

  it('low-confidence mandatory not_met does not trigger K.O.', () => {
    const lowConf = demoCriteria.map((c) =>
      c.id === 'min-employees' ? { ...c, confidence: 'low' as const } : c
    )
    const assessment = compareEligibilityCriteria(lowConf, {
      profile: { employeeCount: 100, annualRevenueEur: 80_000_000 },
      complianceDocs: [],
      referenceCount: 0,
    })
    expect(assessment.criteria[0]?.status).toBe('not_met')
    expect(assessment.verdict).not.toBe('ko')
  })

  it('reference_count criterion uses org reference stock', () => {
    const criteria = [
      criterion({
        id: 'refs',
        dimension: 'reference_count',
        label: '≥ 3 Referenzen',
        value: 3,
      }),
    ]
    const met = compareEligibilityCriteria(criteria, {
      profile: { employeeCount: 1 },
      complianceDocs: [],
      referenceCount: 5,
    })
    expect(met.criteria[0]?.status).toBe('met')

    const notMet = compareEligibilityCriteria(criteria, {
      profile: { employeeCount: 1 },
      complianceDocs: [],
      referenceCount: 1,
    })
    expect(notMet.criteria[0]?.status).toBe('not_met')
  })

  it('certification can match compliance documents', () => {
    const criteria = [
      criterion({
        id: 'iso',
        dimension: 'certification',
        label: 'ISO 27001',
        operator: 'contains',
        value: 'ISO 27001',
        confidence: 'high',
      }),
    ]
    const assessment = compareEligibilityCriteria(criteria, {
      profile: {},
      complianceDocs: [
        {
          document_type: 'certification',
          title: 'ISO 27001 Zertifikat',
          valid_until: null,
          file_storage_path: '/x',
        },
      ],
      referenceCount: 0,
    })
    expect(assessment.criteria[0]?.status).toBe('met')
  })

  it('region mismatch → not_met on mandatory region criterion', () => {
    const criteria = [
      criterion({
        id: 'region-dach',
        dimension: 'region',
        label: 'DACH-Region',
        operator: 'contains',
        value: 'DACH',
      }),
    ]
    const assessment = compareEligibilityCriteria(criteria, {
      profile: { regions: ['Benelux'] },
      complianceDocs: [],
      referenceCount: 0,
    })
    expect(assessment.criteria[0]?.status).toBe('not_met')
  })

  it('non-mandatory not_met does not alone cause K.O.', () => {
    const criteria = [
      criterion({
        id: 'nice',
        dimension: 'employee_count',
        label: 'Wunsch: 1000 MA',
        value: 1000,
        mandatory: false,
        confidence: 'high',
      }),
    ]
    const assessment = compareEligibilityCriteria(criteria, {
      profile: { employeeCount: 50 },
      complianceDocs: [],
      referenceCount: 0,
    })
    expect(assessment.criteria[0]?.status).toBe('not_met')
    expect(assessment.verdict).not.toBe('ko')
  })

  it('partial certification → partner_required when mandatory', () => {
    const criteria = [
      criterion({
        id: 'certs',
        dimension: 'certification',
        label: '5x ISO 27001 Berater',
        operator: 'gte',
        value: 'ISO 27001',
        unit: '5',
        confidence: 'medium',
      }),
    ]
    const assessment = compareEligibilityCriteria(criteria, {
      profile: { certifiedRoles: [{ role: 'ISO 27001', count: 2 }] },
      complianceDocs: [],
      referenceCount: 0,
    })
    expect(assessment.criteria[0]?.status).toBe('partial')
    expect(assessment.verdict).toBe('partner_required')
  })

  it('no criteria → unknown verdict', () => {
    const assessment = compareEligibilityCriteria([], {
      profile: { employeeCount: 500 },
      complianceDocs: [],
      referenceCount: 0,
    })
    expect(assessment.verdict).toBe('unknown')
  })
})
