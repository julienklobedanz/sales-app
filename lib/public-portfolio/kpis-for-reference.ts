import type { PublicReference } from '@/app/p/actions'
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
  options?: { max?: number }
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

  const industry = ref.industry?.trim()
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

const A4_W_PT = 595.28

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

function estimatePdfWeight(refs: PublicReference[]): { refCount: number; weight: number } {
  const refCount = refs.length
  let weight = 0
  for (const r of refs) {
    weight += 220
    weight += (r.title?.length ?? 0) * 1.1
    weight += (r.summary?.length ?? 0) * 0.38
    weight += (r.customer_challenge?.length ?? 0) * 0.38
    weight += (r.our_solution?.length ?? 0) * 0.38
    weight += (r.approval_quote_approved?.length ?? 0) * 0.28
  }
  return { refCount, weight }
}

/**
 * Eine A4-Seite: Skalierung (0,62–1) + angepasste Textlimits, damit der Inhalt möglichst auf eine Seite passt.
 */
export function computePublicPortfolioPdfLayout(refs: PublicReference[]): PublicPortfolioPdfLayout {
  const { refCount, weight } = estimatePdfWeight(refs)
  let scale = 1
  if (refCount >= 2) scale *= 0.9
  if (refCount >= 3) scale *= 0.9
  if (refCount >= 4) scale *= 0.88
  if (weight > 1800) scale *= 0.94
  if (weight > 3000) scale *= 0.93
  if (weight > 4800) scale *= 0.92
  if (weight > 7000) scale *= 0.9
  if (weight > 9500) scale *= 0.88
  scale = Math.max(0.62, Math.min(1, scale))

  const density = 1 / scale + Math.max(0, refCount - 1) * 0.14

  return {
    scale,
    canvasWidthPt: A4_W_PT / scale,
    summaryMax: Math.round(Math.min(720, Math.max(200, 420 / density))),
    challengeMax: Math.round(Math.min(520, Math.max(140, 300 / density))),
    solutionMax: Math.round(Math.min(720, Math.max(200, 420 / density))),
    quoteMax: Math.round(Math.min(320, Math.max(100, 200 / density))),
    titleMax: Math.round(Math.min(140, Math.max(72, 110 / density))),
    tagLimit: Math.max(3, Math.min(8, 9 - refCount * 2)),
  }
}
