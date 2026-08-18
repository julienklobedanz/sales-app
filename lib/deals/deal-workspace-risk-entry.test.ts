import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import type { RequestedEvidenceGapItem } from '@/lib/deals/build-requested-evidence-gaps'

import {
  buildDealWorkspaceRiskEntries,
  parseDealWorkspaceRiskEntryId,
} from './deal-workspace-risk-entry'

const flag = (
  id: string,
  title = 'Risiko',
): DealDeskRedFlag => ({
  id,
  severity: 'high',
  title,
  excerpt: 'Auszug',
})

const gap = (id: string, label: string): RequestedEvidenceGapItem => ({
  id,
  label,
  detail: 'fehlt',
  severity: 'missing',
})

describe('deal workspace risk entries', () => {
  it('benennt positionsbasierte rf-* als snapshot-gebunden', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'lib/deals/deal-workspace-risk-entry.ts'),
      'utf8',
    )
    expect(src).toMatch(/positionsbasiert/)
    expect(src).toMatch(/Neuanalyse/)
  })

  it('präfixt Flags, Evidence und SME in Listenreihenfolge', () => {
    const entries = buildDealWorkspaceRiskEntries({
      redFlags: [flag('rf-1', 'Vertrag')],
      requestedEvidenceGaps: [gap('sub-ISO27001', 'ISO 27001')],
      smeGroups: [
        {
          topic: 'Technik',
          items: [{ id: 'sme-req-1', question: 'Wer betreibt?', category: 'Technik', dueInDays: 0 }],
        },
      ],
    })
    expect(entries.map((e) => e.id)).toEqual([
      'rf:rf-1',
      'ev:sub-ISO27001',
      'sme:sme-req-1',
    ])
    expect(entries[0]?.kind).toBe('red-flag')
    expect(entries[1]?.kind).toBe('evidence')
    expect(entries[2]?.kind).toBe('sme')
  })

  it('hängt bei Truncation-Kollision ~2 an — Lookup trifft den zweiten Eintrag', () => {
    const prefix = 'a'.repeat(40)
    const entries = buildDealWorkspaceRiskEntries({
      redFlags: [],
      requestedEvidenceGaps: [
        gap(`sub-${prefix}`, `${prefix} erste Anforderung`),
        gap(`sub-${prefix}`, `${prefix} zweite Anforderung`),
      ],
      smeGroups: [],
    })
    expect(entries).toHaveLength(2)
    expect(entries[0]?.id).toBe(`ev:sub-${prefix}`)
    expect(entries[1]?.id).toBe(`ev:sub-${prefix}~2`)
    expect(entries[1]?.id).not.toContain('#')
    expect(parseDealWorkspaceRiskEntryId(entries[1]!.id)?.prefix).toBe('ev')

    const second = resolveCollectionObjectSelection(entries, entries[1]!.id)
    expect(second.selected).toBe(entries[1])
    expect(second.selected?.title).toContain('zweite')
    expect(second.invalidId).toBe(false)

    const first = resolveCollectionObjectSelection(entries, entries[0]!.id)
    expect(first.selected).toBe(entries[0])
  })

  it('lehnt unbekannte Prefixes ab', () => {
    expect(parseDealWorkspaceRiskEntryId('xx:foo')).toBeNull()
    expect(parseDealWorkspaceRiskEntryId('rf')).toBeNull()
    expect(parseDealWorkspaceRiskEntryId('rf:')).toBeNull()
    expect(parseDealWorkspaceRiskEntryId('rf:abc')).toEqual({
      prefix: 'rf',
      rest: 'abc',
    })
  })

  it('macht unbekannte Query-IDs invalid — kein stiller erster Treffer', () => {
    const entries = buildDealWorkspaceRiskEntries({
      redFlags: [flag('rf-1')],
      requestedEvidenceGaps: [],
      smeGroups: [],
    })
    expect(resolveCollectionObjectSelection(entries, 'xx:foo')).toEqual({
      selected: null,
      invalidId: true,
    })
    expect(resolveCollectionObjectSelection(entries, 'rf:missing')).toEqual({
      selected: null,
      invalidId: true,
    })
  })
})
