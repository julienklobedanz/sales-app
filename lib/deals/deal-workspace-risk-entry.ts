import type { DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import type { RequestedEvidenceGapItem } from '@/lib/deals/build-requested-evidence-gaps'
import type { SmeTopicGroup } from '@/lib/deals/group-sme-by-topic'

/**
 * Risiko-Deeplinks gelten für den Analyse-Snapshot. `rf-*` ohne LLM-id sind
 * positionsbasiert (`rf-${i}` in der Engine) und können nach einer Neuanalyse
 * auf einen anderen Eintrag zeigen — die ID bleibt gültig, das Strippen
 * ungültiger Query greift nicht.
 */

const DEAL_WORKSPACE_RISK_ENTRY_PREFIXES = ['rf', 'sme', 'ev'] as const

export type DealWorkspaceRiskEntryPrefix =
  (typeof DEAL_WORKSPACE_RISK_ENTRY_PREFIXES)[number]

export type DealWorkspaceRiskEntry =
  | {
      id: string
      kind: 'red-flag'
      title: string
      excerpt: string
      severity: DealDeskRedFlag['severity']
    }
  | {
      id: string
      kind: 'evidence'
      title: string
      detail: string
      severity: RequestedEvidenceGapItem['severity']
    }
  | {
      id: string
      kind: 'sme'
      title: string
      topic: string
      contextExcerpt?: string
    }

export function parseDealWorkspaceRiskEntryId(id: string): {
  prefix: DealWorkspaceRiskEntryPrefix
  rest: string
} | null {
  const colon = id.indexOf(':')
  if (colon <= 0) return null
  const prefix = id.slice(0, colon)
  const rest = id.slice(colon + 1)
  if (!rest) return null
  if (prefix !== 'rf' && prefix !== 'sme' && prefix !== 'ev') return null
  return { prefix, rest }
}

function uniquifyPrefixedId(id: string, seen: Set<string>): string {
  if (!seen.has(id)) {
    seen.add(id)
    return id
  }
  let n = 2
  let next = `${id}~${n}`
  while (seen.has(next)) {
    n += 1
    next = `${id}~${n}`
  }
  seen.add(next)
  return next
}

function prefixedId(
  prefix: DealWorkspaceRiskEntryPrefix,
  raw: string,
  seen: Set<string>,
): string {
  return uniquifyPrefixedId(`${prefix}:${raw}`, seen)
}

export function buildDealWorkspaceRiskEntries(input: {
  redFlags: DealDeskRedFlag[]
  requestedEvidenceGaps: RequestedEvidenceGapItem[]
  smeGroups: SmeTopicGroup[]
}): DealWorkspaceRiskEntry[] {
  const seen = new Set<string>()
  const entries: DealWorkspaceRiskEntry[] = []

  for (const flag of input.redFlags) {
    entries.push({
      id: prefixedId('rf', flag.id, seen),
      kind: 'red-flag',
      title: flag.title,
      excerpt: flag.excerpt,
      severity: flag.severity,
    })
  }

  for (const gap of input.requestedEvidenceGaps) {
    entries.push({
      id: prefixedId('ev', gap.id, seen),
      kind: 'evidence',
      title: gap.label,
      detail: gap.detail,
      severity: gap.severity,
    })
  }

  for (const group of input.smeGroups) {
    for (const item of group.items) {
      entries.push({
        id: prefixedId('sme', item.id, seen),
        kind: 'sme',
        title: item.question,
        topic: group.topic,
        contextExcerpt: item.contextExcerpt,
      })
    }
  }

  return entries
}
