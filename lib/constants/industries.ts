/**
 * Kanonische Branchenliste (Phase 1 Industrie-Refactoring).
 *
 * - `id`: interner Wert für DB/API — niemals roh im UI anzeigen.
 * - `labelDe` / `labelEn`: sichtbare Labels je nach Sprachkontext.
 */
export interface Industry {
  id: string
  labelDe: string
  labelEn: string
}

export const MASTER_INDUSTRIES: Industry[] = [
  {
    id: 'fin',
    labelDe: 'Finanzdienstleistungen & Versicherung',
    labelEn: 'Financial Services & Insurance',
  },
  { id: 'ret', labelDe: 'Handel & Konsumgüter', labelEn: 'Retail & Consumer Goods' },
  { id: 'man', labelDe: 'Industrie & Automotive', labelEn: 'Manufacturing & Automotive' },
  {
    id: 'tech',
    labelDe: 'Software, Tech & Telekommunikation',
    labelEn: 'Software, Tech & Telecom',
  },
  {
    id: 'media',
    labelDe: 'Medien, Marketing & Unterhaltung',
    labelEn: 'Media, Entertainment & Marketing',
  },
  {
    id: 'energy',
    labelDe: 'Energie, Versorgung & Rohstoffe',
    labelEn: 'Energy, Utilities & Resources',
  },
  {
    id: 'health',
    labelDe: 'Gesundheitswesen, Life Sciences & Chemie',
    labelEn: 'Healthcare, Life Sciences & Chemical',
  },
  {
    id: 'pub',
    labelDe: 'Öffentlicher Sektor & Bildung',
    labelEn: 'Public Sector & Education',
  },
  {
    id: 'log',
    labelDe: 'Logistik, Transport & Aviation',
    labelEn: 'Logistics, Transport & Aviation',
  },
  {
    id: 'cons',
    labelDe: 'Beratung & Professional Services',
    labelEn: 'Professional Services & Consulting',
  },
  {
    id: 'prop',
    labelDe: 'Immobilien & Bauwirtschaft',
    labelEn: 'Real Estate & Construction',
  },
  { id: 'other', labelDe: 'Sonstige', labelEn: 'Other' },
]

const INDUSTRY_BY_ID = new Map(MASTER_INDUSTRIES.map((item) => [item.id, item]))

/** Legacy-Labels (vor Master-IDs) → kanonische `id`. */
const LEGACY_INDUSTRY_LABEL_TO_ID: Record<string, string> = {
  'Technologie, Medien & Telekommunikation': 'tech',
  'Energie, Rohstoffe & Versorgung': 'energy',
  'Gesundheitswesen & Life Sciences': 'health',
  'Beratung & Logistik': 'cons',
  'Reise, Transport & Gastgewerbe': 'log',
  'Retail & Consumer Goods (CPG)': 'ret',
  'Technology, Media & Telecom (TMT)': 'tech',
  'Energy, Resources & Utilities': 'energy',
  'Healthcare & Life Sciences': 'health',
  'Professional Services & Logistics': 'cons',
  'Travel, Transport & Hospitality': 'log',
  'Professional Services & Consulting': 'cons',
  'Logistik & Transport': 'log',
  Sonstige: 'other',
  Other: 'other',
}

export function isIndustryId(value: string | null | undefined): boolean {
  const id = String(value ?? '').trim()
  return id.length > 0 && INDUSTRY_BY_ID.has(id)
}

/** Normalisiert gespeicherte Werte (id, labelDe, labelEn, Legacy) auf eine Master-`id`. */
export function resolveIndustryId(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (INDUSTRY_BY_ID.has(raw)) return raw

  const byDe = MASTER_INDUSTRIES.find((item) => item.labelDe === raw)
  if (byDe) return byDe.id

  const byEn = MASTER_INDUSTRIES.find((item) => item.labelEn === raw)
  if (byEn) return byEn.id

  const legacy = LEGACY_INDUSTRY_LABEL_TO_ID[raw]
  if (legacy && INDUSTRY_BY_ID.has(legacy)) return legacy

  return ''
}

export function getIndustryLabelDe(id: string | null | undefined): string {
  const resolved = resolveIndustryId(id)
  if (!resolved) return ''
  return INDUSTRY_BY_ID.get(resolved)?.labelDe ?? ''
}

/** Anzeige-Label für UI/PDF — mappt ids & Legacy-Labels, sonst Rohwert als Fallback. */
export function formatIndustryDisplay(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const label = getIndustryLabelDe(raw)
  return label || raw
}

/** Kompaktes Tabellen-Label: Segment vor dem Komma oder maximal zwei Wörter. */
export function formatIndustryDisplayCompact(value: string | null | undefined): {
  compact: string
  full: string
} {
  const full = formatIndustryDisplay(value)
  if (!full) return { compact: '', full: '' }

  const comma = full.indexOf(',')
  if (comma > 0) {
    return { compact: full.slice(0, comma).trim(), full }
  }

  const words = full.split(/\s+/).filter(Boolean)
  if (words.length <= 2) return { compact: full, full }

  return { compact: `${words.slice(0, 2).join(' ')}…`, full }
}
