export type IcpDefinition = {
  /** Ziel-Branche(n) im ICP */
  industry?: string
  /** Volumen-Band, z. B. „500k–2M EUR" */
  volumeBand?: string
  /** Bevorzugte Region */
  region?: string
  /** Firmengröße des Ziel-Accounts */
  accountSize?: string
  /** Segment, z. B. Enterprise / Mid-Market */
  segment?: string
}

export type IcpRubrikItem = {
  field: keyof IcpDefinition
  label: string
  definitionValue: string
  dealValue: string | null
  met: boolean | null
}

export type IcpRubrikScore = {
  score: number
  max: number
  items: IcpRubrikItem[]
  summary: string
}

const RUBRIK_FIELDS: Array<{ field: keyof IcpDefinition; label: string }> = [
  { field: 'industry', label: 'Branche' },
  { field: 'volumeBand', label: 'Volumen-Band' },
  { field: 'region', label: 'Region' },
  { field: 'accountSize', label: 'Firmengröße Account' },
  { field: 'segment', label: 'Segment' },
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function fuzzyMatch(
  definition: string,
  dealValue: string | null | undefined,
): boolean | null {
  const def = definition.trim()
  if (!def) return null
  const deal = (dealValue ?? '').trim()
  if (!deal) return null

  const d = normalize(def)
  const v = normalize(deal)
  if (!v) return null

  if (d.includes(v) || v.includes(d)) return true

  const defTokens = d.split(' ').filter((t) => t.length >= 3)
  const dealTokens = v.split(' ').filter((t) => t.length >= 3)
  const overlap = defTokens.filter((t) =>
    dealTokens.some((dt) => dt.includes(t) || t.includes(dt)),
  )
  if (overlap.length >= Math.min(2, defTokens.length)) return true

  return false
}

export function parseIcpDefinition(raw: unknown): IcpDefinition {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const pick = (key: keyof IcpDefinition) =>
    typeof o[key] === 'string' && o[key]!.trim() ? String(o[key]).trim() : undefined

  return {
    industry: pick('industry'),
    volumeBand: pick('volumeBand'),
    region: pick('region'),
    accountSize: pick('accountSize'),
    segment: pick('segment'),
  }
}

export function isIcpDefinitionEmpty(definition: IcpDefinition): boolean {
  return RUBRIK_FIELDS.every(({ field }) => !definition[field]?.trim())
}

export type IcpDealContext = {
  industry?: string | null
  volume?: string | null
  title?: string | null
  region?: string | null
}

export function scoreIcpRubrik(
  definition: IcpDefinition,
  deal: IcpDealContext,
): IcpRubrikScore {
  const items: IcpRubrikItem[] = RUBRIK_FIELDS.map(({ field, label }) => {
    const definitionValue = definition[field]?.trim() ?? ''
    let dealValue: string | null = null
    if (field === 'industry') dealValue = deal.industry ?? null
    else if (field === 'volumeBand') dealValue = deal.volume ?? null
    else if (field === 'region') dealValue = deal.region ?? null
    else if (field === 'accountSize') dealValue = deal.title ?? null
    else if (field === 'segment') dealValue = deal.title ?? null

    const met = definitionValue ? fuzzyMatch(definitionValue, dealValue) : null

    return {
      field,
      label,
      definitionValue,
      dealValue,
      met,
    }
  })

  const scored = items.filter((i) => i.met !== null)
  const score = scored.filter((i) => i.met === true).length
  const max = RUBRIK_FIELDS.length

  const summary = isIcpDefinitionEmpty(definition)
    ? 'ICP-Rubrik in Settings noch nicht definiert.'
    : scored.length === 0
      ? 'Zu wenig Deal-Daten für Rubrik-Abgleich.'
      : `${score} von ${max} Rubrik-Kriterien erfüllt`

  return { score, max, items, summary }
}
