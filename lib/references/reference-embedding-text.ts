/**
 * Kanonischer Text für Referenz-Embeddings (Index + Backfill + Edge Function spiegeln diese Struktur).
 */
export type ReferenceEmbeddingSource = {
  title?: string | null
  industry?: string | null
  customer_challenge?: string | null
  our_solution?: string | null
  summary?: string | null
  volume_eur?: string | null
  tags?: string | null
  country?: string | null
  contract_type?: string | null
  incumbent_provider?: string | null
  competitors?: string | null
  project_status?: string | null
  company_name?: string | null
}

function pushLine(lines: string[], value: string | null | undefined) {
  const t = value?.trim()
  if (t) lines.push(t)
}

function pushLabeled(lines: string[], label: string, value: string | null | undefined) {
  const t = value?.trim()
  if (t) lines.push(`${label}: ${t}`)
}

function formatTags(tags: string | null | undefined): string | null {
  const raw = tags?.trim()
  if (!raw) return null
  return raw
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ')
}

function formatVolumeForEmbed(volume: string | null | undefined): string | null {
  const raw = volume?.trim()
  if (!raw) return null
  const digits = raw.replace(/[^\d]/g, '')
  const n = Number.parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return raw
  if (n >= 1_000_000) {
    const mio = (n / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })
    return `${raw} (circa ${mio} Millionen Euro)`
  }
  return raw
}

function formatProjectStatus(status: string | null | undefined): string | null {
  const s = status?.trim().toLowerCase()
  if (!s) return null
  if (s === 'active') return 'Aktiv'
  if (s === 'completed') return 'Abgeschlossen'
  return status!.trim()
}

export function buildReferenceEmbeddingText(ref: ReferenceEmbeddingSource): string {
  const lines: string[] = []

  pushLabeled(lines, 'Kunde/Account', ref.company_name)
  pushLabeled(lines, 'Branche', ref.industry)
  pushLabeled(lines, 'Region', ref.country)
  pushLabeled(lines, 'Volumen', formatVolumeForEmbed(ref.volume_eur))
  pushLabeled(lines, 'Vertragsart', ref.contract_type)
  pushLabeled(lines, 'Projektstatus', formatProjectStatus(ref.project_status))
  pushLabeled(lines, 'Incumbent', ref.incumbent_provider)
  pushLabeled(lines, 'Wettbewerb', ref.competitors)

  const tags = formatTags(ref.tags)
  if (tags) lines.push(`Tags: ${tags}`)

  pushLine(lines, ref.title)

  if (ref.customer_challenge?.trim()) {
    lines.push(`Herausforderung:\n${ref.customer_challenge.trim()}`)
  }
  if (ref.our_solution?.trim()) {
    lines.push(`Lösung:\n${ref.our_solution.trim()}`)
  }
  if (ref.summary?.trim()) {
    lines.push(`Zusammenfassung:\n${ref.summary.trim()}`)
  }

  return lines.join('\n\n')
}

/** Spalten, deren Änderung ein neues Embedding auslösen soll. */
export const REFERENCE_EMBEDDING_TRIGGER_FIELDS = [
  'title',
  'industry',
  'customer_challenge',
  'our_solution',
  'summary',
  'volume_eur',
  'tags',
  'country',
  'contract_type',
  'incumbent_provider',
  'competitors',
  'project_status',
  'company_id',
] as const
