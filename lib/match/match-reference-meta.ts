import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatReferenceVolume } from '@/lib/format'

/** MM/YYYY aus ISO-Datum/Timestamp (z. B. 03/2025). */
export function formatMatchReferenceMetaMonthYear(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return ''
  const raw = String(value).trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (dateOnly) {
    return `${dateOnly[2]}/${dateOnly[1]}`
  }
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return ''
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = String(dt.getUTCFullYear())
  return `${mm}/${yyyy}`
}

export type MatchReferenceMetaFields = {
  industry?: string | null
  volumeEur?: string | null
  createdAt?: string | null
  projectStart?: string | null
  projectEnd?: string | null
}

/**
 * Einheitliche Meta-Zeile für Match-/Referenz-Karten:
 * Branche · Volumen · Aktualität (MM/YYYY, Projektende → Start → created)
 */
export function formatMatchReferenceMetaLine(fields: MatchReferenceMetaFields): string {
  const industry = formatIndustryDisplay(fields.industry) || null
  const volume = fields.volumeEur ? formatReferenceVolume(fields.volumeEur) || null : null
  const when =
    formatMatchReferenceMetaMonthYear(
      fields.projectEnd || fields.projectStart || fields.createdAt
    ) || null
  return [industry, volume, when].filter(Boolean).join(' · ')
}
