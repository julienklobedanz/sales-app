import { describe, expect, it } from 'vitest'

import {
  extractDealRfpSectionData,
  toPersistedAnalysisSnapshot,
} from '@/lib/deal-desk/analysis-snapshot'
import { buildEmptyDealDeskAnalysis } from '@/lib/deal-desk/mock-analysis'

describe('analysis-snapshot', () => {
  it('round-trips requirements and coverage for Deal RFP section', () => {
    const snapshot = buildEmptyDealDeskAnalysis(['test.pdf'], 'Kunde', 42)
    const requirements = [{ id: 'r1', text: 'ISO 27001', category: 'security' }]
    const coverage = [
      {
        requirementId: 'r1',
        requirementText: 'ISO 27001',
        category: 'security',
        matches: [],
      },
    ]
    const persisted = toPersistedAnalysisSnapshot({ snapshot, requirements, coverage })
    const section = extractDealRfpSectionData('proj-1', persisted)
    expect(section?.projectId).toBe('proj-1')
    expect(section?.requirements).toEqual(requirements)
    expect(section?.coverage).toEqual(coverage)
  })

  it('returns null when coverage is missing from legacy snapshot', () => {
    const snapshot = buildEmptyDealDeskAnalysis(['legacy.pdf'])
    expect(extractDealRfpSectionData('p', snapshot)).toBeNull()
  })
})
