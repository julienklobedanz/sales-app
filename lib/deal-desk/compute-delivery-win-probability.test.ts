import { describe, expect, it } from 'vitest'

import {
  computeDeliveryWinProbability,
  isComplianceRequirement,
  isComplianceRequirementFulfilled,
} from './compute-delivery-win-probability'
import type { RfpCoverageRow } from '../rfp-coverage'

describe('computeDeliveryWinProbability', () => {
  it('kombiniert Portfolio, Capabilities und Nachweise ohne KI-Score', () => {
    const breakdown = computeDeliveryWinProbability({
      requirements: [
        { id: 'r1', text: 'Cloud Hosting in EU', category: 'Hosting' },
        { id: 'r2', text: 'SAP Schnittstelle', category: 'Integration' },
        {
          id: 'r3',
          text: 'ISO 27001 Zertifizierung erforderlich',
          category: 'Compliance',
        },
      ],
      coverage: [
        {
          requirementId: 'r1',
          requirementText: 'Cloud Hosting in EU',
          matches: [
            {
              id: 'a',
              title: 'Ref',
              summary: null,
              industry: null,
              similarity: 0.72,
              companyName: 'X',
            },
          ],
        },
        {
          requirementId: 'r2',
          requirementText: 'SAP Schnittstelle',
          matches: [
            {
              id: 'b',
              title: 'Ref2',
              summary: null,
              industry: null,
              similarity: 0.6,
              companyName: 'Y',
            },
          ],
        },
        {
          requirementId: 'r3',
          requirementText: 'ISO 27001',
          matches: [],
        },
      ] as RfpCoverageRow[],
      complianceDocs: [
        {
          document_type: 'iso_27001',
          title: 'ISO 27001',
          valid_until: '2030-01-01',
          file_storage_path: 'org/doc.pdf',
        },
      ],
      redFlags: [{ id: 'rf-1', severity: 'high', title: 'Haftung', excerpt: '…' }],
      matchThreshold: 0.55,
    })

    expect(breakdown.portfolioScore).toBe(100)
    expect(breakdown.capabilityScore).toBeGreaterThan(50)
    expect(breakdown.evidenceScore).toBe(100)
    expect(breakdown.contractPenalty).toBe(5)
    expect(breakdown.finalScore).toBe(breakdown.weightedScore - breakdown.contractPenalty)
    expect(breakdown.finalScore).toBeLessThanOrEqual(100)
  })

  it('erkennt Compliance-Anforderungen', () => {
    expect(
      isComplianceRequirement({
        text: 'Anbieter muss ISO 27001 nachweisen',
        category: 'Security',
      }),
    ).toBe(true)
    expect(
      isComplianceRequirement({ text: 'API Integration REST', category: 'Tech' }),
    ).toBe(false)
  })

  it('prüft Nachweise nur mit hochgeladenem Dokument', () => {
    expect(
      isComplianceRequirementFulfilled({ text: 'ISO 27001 erforderlich' }, [
        {
          document_type: 'iso_27001',
          title: 'ISO',
          valid_until: null,
          file_storage_path: null,
        },
      ]),
    ).toBe(false)
    expect(
      isComplianceRequirementFulfilled({ text: 'ISO 27001 erforderlich' }, [
        {
          document_type: 'iso_27001',
          title: 'ISO',
          valid_until: '2030-01-01',
          file_storage_path: 'x.pdf',
        },
      ]),
    ).toBe(true)
  })
})
