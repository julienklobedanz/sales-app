import type { DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'

/**
 * Risiko-Deeplinks gelten für den Analyse-Snapshot. `rf-*` ohne LLM-id sind
 * positionsbasiert (`rf-${i}` in der Engine) und können nach einer Neuanalyse
 * auf einen anderen Eintrag zeigen — die ID bleibt gültig, das Strippen
 * ungültiger Query greift nicht.
 */

export type DealWorkspaceRiskEntryPrefix = 'rf'

export type DealWorkspaceRiskEntry = {
  id: string
  kind: 'red-flag'
  title: string
  excerpt: string
  severity: DealDeskRedFlag['severity']
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
  if (prefix !== 'rf') return null
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

function prefixedId(raw: string, seen: Set<string>): string {
  return uniquifyPrefixedId(`rf:${raw}`, seen)
}

export function buildDealWorkspaceRiskEntries(input: {
  redFlags: DealDeskRedFlag[]
}): DealWorkspaceRiskEntry[] {
  const seen = new Set<string>()
  const entries: DealWorkspaceRiskEntry[] = []

  for (const flag of input.redFlags) {
    entries.push({
      id: prefixedId(flag.id, seen),
      kind: 'red-flag',
      title: flag.title,
      excerpt: flag.excerpt,
      severity: flag.severity,
    })
  }

  return entries
}
