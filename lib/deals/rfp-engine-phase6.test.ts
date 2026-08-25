import { describe, expect, it } from 'vitest'

import { workspaceFromRfpSnapshot } from '@/lib/deal-desk/workspace-from-snapshot'
import { groupSmeTasksByTopic } from '@/lib/deals/group-sme-by-topic'
import {
  computeCoveragePercentWithVerdicts,
  isRequirementCovered,
} from '@/lib/deals/rfp-relevance-coverage'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'

describe('workspaceFromRfpSnapshot', () => {
  it('maps smeTasks to smeRoutes keys for DB persist', () => {
    const workspace = workspaceFromRfpSnapshot({
      documentName: 'x',
      documentNames: ['x'],
      customerName: 'C',
      winProbability: 50,
      icpFitLabel: 'Fit',
      icpSummary: 's',
      redFlags: [{ id: 'rf-1', severity: 'high', title: 'Haftung', excerpt: '' }],
      timelineItems: [],
      draftRows: [],
      smeTasks: [
        {
          id: 'sme-req-a',
          question: 'Klärung A',
          category: 'Security',
        },
        {
          id: 'sme-req-b',
          question: 'Klärung B',
          category: 'Legal',
        },
      ],
    })

    expect(workspace.redFlags).toHaveLength(1)
    expect(Object.keys(workspace.smeRoutes)).toEqual(['sme-req-a', 'sme-req-b'])
    expect(workspace.smeRoutes['sme-req-a']).toBe('open')
  })
})

describe('groupSmeTasksByTopic', () => {
  it('groups SME tasks by category/topic', () => {
    const groups = groupSmeTasksByTopic([
      { id: '1', question: 'Q1', category: 'Security' },
      { id: '2', question: 'Q2', category: 'Legal' },
      { id: '3', question: 'Q3', category: 'Security' },
    ])
    expect(groups).toHaveLength(2)
    const security = groups.find((g) => g.topic === 'Security')
    expect(security?.items).toHaveLength(2)
  })
})

describe('rfp-relevance-coverage', () => {
  const row: RfpCoverageRow = {
    requirementId: 'req-1',
    requirementText: 'Post-Quantum Crypto',
    matches: [
      {
        id: 'r1',
        title: 'Apple',
        summary: null,
        industry: null,
        similarity: 0.44,
        companyName: 'A',
      },
    ],
  }

  it('treats LLM none verdict as not covered despite high similarity', () => {
    expect(
      isRequirementCovered(row, {
        'req-1': { verdict: 'none', chosenId: null, reason: 'thematisch falsch' },
      }),
    ).toBe(false)
  })

  it('counts covers and partial as covered', () => {
    expect(
      isRequirementCovered(row, {
        'req-1': { verdict: 'covers', chosenId: 'r1', reason: 'passt' },
      }),
    ).toBe(true)
    expect(
      isRequirementCovered(row, {
        'req-1': { verdict: 'partial', chosenId: 'r1', reason: 'teilweise' },
      }),
    ).toBe(true)
  })

  it('computeCoveragePercentWithVerdicts ignores false-positive similarity', () => {
    const pct = computeCoveragePercentWithVerdicts([{ id: 'req-1', text: 'x' }], [row], {
      'req-1': { verdict: 'none', chosenId: null, reason: 'none' },
    })
    expect(pct).toBe(0)
  })
})
