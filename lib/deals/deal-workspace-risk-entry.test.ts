import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'

import {
  buildDealWorkspaceRiskEntries,
  parseDealWorkspaceRiskEntryId,
} from './deal-workspace-risk-entry'

const flag = (id: string, title = 'Risiko'): DealDeskRedFlag => ({
  id,
  severity: 'high',
  title,
  excerpt: 'Auszug',
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

  it('präfixt nur Vertrags-Flags', () => {
    const entries = buildDealWorkspaceRiskEntries({
      redFlags: [flag('rf-1', 'Vertrag')],
    })
    expect(entries.map((e) => e.id)).toEqual(['rf:rf-1'])
    expect(entries[0]?.kind).toBe('red-flag')
  })

  it('hängt bei Truncation-Kollision ~2 an — Lookup trifft den zweiten Eintrag', () => {
    const prefix = 'a'.repeat(40)
    const entries = buildDealWorkspaceRiskEntries({
      redFlags: [
        flag(prefix, `${prefix} erstes Risiko`),
        flag(prefix, `${prefix} zweites Risiko`),
      ],
    })
    expect(entries).toHaveLength(2)
    expect(entries[0]?.id).toBe(`rf:${prefix}`)
    expect(entries[1]?.id).toBe(`rf:${prefix}~2`)
    expect(entries[1]?.id).not.toContain('#')
    expect(parseDealWorkspaceRiskEntryId(entries[1]!.id)?.prefix).toBe('rf')

    const second = resolveCollectionObjectSelection(entries, entries[1]!.id)
    expect(second.selected).toBe(entries[1])
    expect(second.selected?.title).toContain('zweites')
    expect(second.invalidId).toBe(false)
  })

  it('lehnt unbekannte Prefixes ab', () => {
    expect(parseDealWorkspaceRiskEntryId('xx:foo')).toBeNull()
    expect(parseDealWorkspaceRiskEntryId('sme:abc')).toBeNull()
    expect(parseDealWorkspaceRiskEntryId('ev:abc')).toBeNull()
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
