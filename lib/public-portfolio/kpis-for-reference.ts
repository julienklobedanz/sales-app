import type { PublicReference } from '@/app/p/actions'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatReferenceVolume } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'

export type PublicPortfolioKpi = { label: string; value: string }

type Candidate = PublicPortfolioKpi & { weight: number }

/** Deutsche Labels für typische DB-/Formularwerte zum Projektstatus */
export function formatProjectStatusDe(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const key = s.toLowerCase().replace(/\s+/g, '_')
  const map: Record<string, string> = {
    active: 'Aktiv',
    completed: 'Abgeschlossen',
    complete: 'Abgeschlossen',
    done: 'Abgeschlossen',
    planned: 'Geplant',
    on_hold: 'Pausiert',
    paused: 'Pausiert',
    cancelled: 'Abgebrochen',
    canceled: 'Abgebrochen',
    inactive: 'Inaktiv',
  }
  return map[key] ?? s
}

/**
 * Bis zu `max` KPI-Karten für die Kundenansicht: priorisiert messbare / RFP-relevante Signale,
 * ohne Dubletten (ein Label pro Karte).
 */
export function kpisForPublicReference(
  ref: PublicReference,
  options?: { max?: number },
): PublicPortfolioKpi[] {
  const max = options?.max ?? 3
  const candidates: Candidate[] = []

  const vol = formatReferenceVolume(ref.volume_eur)
  if (vol) {
    candidates.push({ label: 'Projektvolumen', value: vol, weight: 100 })
  }

  if (ref.duration_months != null && ref.duration_months > 0) {
    candidates.push({
      label: 'Laufzeit',
      value: `${ref.duration_months} Monate`,
      weight: 94,
    })
  }

  if (ref.employee_count != null && ref.employee_count > 0) {
    candidates.push({
      label: 'Account-Größe',
      value: `${ref.employee_count.toLocaleString('de-DE')} Mitarbeitende`,
      weight: 88,
    })
  }

  const contract = formatContractTypeDisplay(ref.contract_type)
  if (contract) {
    candidates.push({ label: 'Vertragsart', value: contract, weight: 76 })
  }

  const status = ref.project_status?.trim()
  if (status) {
    const de = formatProjectStatusDe(status)
    candidates.push({
      label: 'Projektstatus',
      value: de || status,
      weight: 70,
    })
  }

  const industry = formatIndustryDisplay(ref.industry)
  if (industry) {
    candidates.push({ label: 'Branche', value: industry, weight: 62 })
  }

  const country = ref.country?.trim()
  if (country) {
    candidates.push({ label: 'Region', value: country, weight: 56 })
  }

  candidates.sort((a, b) => b.weight - a.weight)

  const out: PublicPortfolioKpi[] = []
  const usedLabels = new Set<string>()
  for (const c of candidates) {
    if (out.length >= max) break
    if (usedLabels.has(c.label)) continue
    usedLabels.add(c.label)
    out.push({ label: c.label, value: c.value })
  }

  return out
}

export type PublicPortfolioPdfLayout = {
  scale: number
  canvasWidthPt: number
  summaryMax: number
  challengeMax: number
  solutionMax: number
  quoteMax: number
  titleMax: number
  tagLimit: number
}
