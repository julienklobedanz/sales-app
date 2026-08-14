import type { DealDeskProjectOwner } from '@/lib/deal-desk/deal-desk-project'
import { resolveProjectLocation } from '@/lib/deal-desk/deal-desk-bid-enrichment'
import type {
  DealDeskMockAnalysis,
  DealDeskTimelineItem,
} from '@/lib/deal-desk/deal-analysis-types'
import { formatNumberDe, formatReferenceVolume, parseReferenceVolume } from '@/lib/format'
import {
  daysUntil,
  formatDateDe,
  normalizeDueTime,
} from '@/lib/deal-desk/timeline-display'
import { getTimelineItemKind } from '@/lib/deal-desk/timeline-item-visual'
import { cn } from '@/lib/utils'

export type BidOverviewMeta = {
  volume: string
  volumeIsAiEstimate: boolean
  location: string
  nextDeadlineDate: string
  /** z. B. „13:00 Uhr“, wenn im RFP eine Uhrzeit hinterlegt ist */
  nextDeadlineTime: string | null
  nextDeadlineDetail: string
  ownerName: string
  ownerInitials: string
  ownerAvatarUrl: string | null
}

/** Kurzform „Alex St.“ aus vollem Namen. */
export function shortenPersonName(fullName: string): string {
  const raw = fullName.trim()
  if (!raw) return '—'
  if (/^du\s*\(/i.test(raw) || raw === 'Du (aktueller Nutzer)') return 'Du'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!
  const first = parts[0]!
  const lastInitial = parts[parts.length - 1]!.charAt(0).toUpperCase()
  return `${first} ${lastInitial}.`
}

export function initialsFromName(fullName: string): string {
  const short = shortenPersonName(fullName)
  if (short === 'Du') return 'DU'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase()
}

export type BidVolumeDisplay = {
  label: string
  /** KI-Schätzung / unscharfer Wert → Sparkles in der UI */
  isAiEstimate: boolean
}

function formatEuroAmountFull(amount: number): string {
  const n = Math.round(amount)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `€ ${formatNumberDe(n)}`
}

function formatEuroAmountRange(low: number, high: number): string {
  const lo = Math.min(low, high)
  const hi = Math.max(low, high)
  if (lo === hi) return formatEuroAmountFull(lo)
  return `${formatEuroAmountFull(lo)} - ${formatEuroAmountFull(hi)}`
}

function euroFromMillions(m: number): number {
  return Math.round(m * 1_000_000)
}

function approximateMillionRange(m: number): { low: number; high: number } {
  const floorM = Math.floor(m)
  const ceilM = Math.max(floorM + 1, Math.ceil(m))
  return { low: euroFromMillions(floorM), high: euroFromMillions(ceilM) }
}

function isApproximateVolumeText(text: string): boolean {
  return /(?:ca\.|circa|ungefähr|etwa|~|approx|geschätzt)/i.test(text)
}

/**
 * Volumen-Anzeige mit voll ausgeschriebenen Beträgen (de-DE Tausenderpunkte).
 * Schätzungen als Millionen-Korridor, z. B. „€ 1.000.000 - € 2.000.000“.
 */
export function formatBidVolumeDisplay(raw: string | null | undefined): BidVolumeDisplay {
  const text = String(raw ?? '').trim()
  if (!text) return { label: '—', isAiEstimate: false }

  const withoutTail = text.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const approx = isApproximateVolumeText(text)

  const explicitRange =
    withoutTail.match(/([\d,.]+)\s*M\s*[-–]\s*([\d,.]+)\s*M\b/i) ??
    withoutTail.match(/([\d,.]+)\s*[-–]\s*([\d,.]+)\s*(?:M(?:io)?|Millionen?)\b/i)
  if (explicitRange) {
    const a = Number.parseFloat(explicitRange[1]!.replace(',', '.'))
    const b = Number.parseFloat(explicitRange[2]!.replace(',', '.'))
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        label: formatEuroAmountRange(euroFromMillions(a), euroFromMillions(b)),
        isAiEstimate: approx || true,
      }
    }
  }

  const explicitEuroRange = withoutTail.match(
    /([\d.]+)\s*[-–]\s*([\d.]+)\s*€|€\s*([\d.]+)\s*[-–]\s*€?\s*([\d.]+)/i,
  )
  if (explicitEuroRange) {
    const aRaw = explicitEuroRange[1] ?? explicitEuroRange[3]
    const bRaw = explicitEuroRange[2] ?? explicitEuroRange[4]
    const a = Number.parseInt(String(aRaw).replace(/\D/g, ''), 10)
    const b = Number.parseInt(String(bRaw).replace(/\D/g, ''), 10)
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      return { label: formatEuroAmountRange(a, b), isAiEstimate: approx }
    }
  }

  const mMatch =
    withoutTail.match(/([\d,.]+)\s*M\s*€/i) ??
    withoutTail.match(/€\s*([\d,.]+)\s*M\b/i) ??
    withoutTail.match(/([\d,.]+)\s*(?:Mio|Millionen)\b/i)
  if (mMatch) {
    const m = Number.parseFloat(mMatch[1]!.replace(',', '.'))
    if (Number.isFinite(m) && m > 0) {
      if (approx || Math.abs(m - Math.round(m)) > 0.001) {
        const { low, high } = approximateMillionRange(m)
        return { label: formatEuroAmountRange(low, high), isAiEstimate: true }
      }
      return { label: formatEuroAmountFull(euroFromMillions(m)), isAiEstimate: false }
    }
  }

  const parsed = parseReferenceVolume(withoutTail)
  if (parsed) {
    const amount = Number.parseInt(parsed.amountDigits, 10)
    if (Number.isFinite(amount) && amount > 0) {
      if (approx && amount >= 1_000_000) {
        const { low, high } = approximateMillionRange(amount / 1_000_000)
        return { label: formatEuroAmountRange(low, high), isAiEstimate: true }
      }
      const formatted = formatReferenceVolume(
        `${parsed.currencyCode === 'EUR' ? '€' : parsed.currencyCode} ${parsed.amountDigits}`,
      )
      if (formatted) {
        const normalized = formatted.startsWith('€')
          ? formatted.replace(/^€\s*/, '€ ')
          : formatted
        return { label: normalized, isAiEstimate: approx }
      }
    }
  }

  const digitsOnly = withoutTail.replace(/\D/g, '')
  if (digitsOnly.length >= 5) {
    const n = Number.parseInt(digitsOnly, 10)
    if (Number.isFinite(n)) {
      if (approx && n >= 1_000_000) {
        const { low, high } = approximateMillionRange(n / 1_000_000)
        return { label: formatEuroAmountRange(low, high), isAiEstimate: true }
      }
      const exact = formatReferenceVolume(`€ ${digitsOnly}`)
      if (exact) {
        const normalized = exact.startsWith('€') ? exact.replace(/^€\s*/, '€ ') : exact
        return { label: normalized, isAiEstimate: approx }
      }
    }
  }

  return { label: text, isAiEstimate: approx }
}

function shortenDeadlineTitle(title: string): string {
  const t = title.trim()
  if (/q\s*&\s*a|rückfrage/i.test(t)) return 'Q&A'
  if (/angebotsabgabe/i.test(t)) return 'Angebotsabgabe'
  return t.length > 28 ? `${t.slice(0, 26)}…` : t
}

export function formatDeadlineTimeForMeta(
  dueTime: string | null | undefined,
): string | null {
  const normalized = normalizeDueTime(dueTime)
  return normalized ? `${normalized} Uhr` : null
}

function parseTimeFromDeadlineText(text: string): string | null {
  const umMatch = text.match(/\bum\s+(\d{1,2})[:.](\d{2})\b/i)
  if (umMatch) {
    return formatDeadlineTimeForMeta(`${umMatch[1]}:${umMatch[2]}`)
  }
  const commaMatch = text.match(/,\s*(\d{1,2})[:.](\d{2})\b/)
  if (commaMatch) {
    return formatDeadlineTimeForMeta(`${commaMatch[1]}:${commaMatch[2]}`)
  }
  const trailingMatch = text.match(/\b(\d{1,2})[:.](\d{2})\s*(?:Uhr)?\s*$/i)
  if (trailingMatch) {
    return formatDeadlineTimeForMeta(`${trailingMatch[1]}:${trailingMatch[2]}`)
  }
  return null
}

/** Nächste zukünftige Frist aus Timeline (oder Briefing-Fallback). */
export function resolveNextRfpDeadline(
  timelineItems: DealDeskTimelineItem[],
  briefingDeadline?: string | null,
  now: Date = new Date(),
): { dateDe: string; timeDe: string | null; detail: string } | null {
  const nowNorm = new Date(now)
  nowNorm.setHours(0, 0, 0, 0)

  const upcoming = [...timelineItems]
    .filter((it) => typeof it.dueDate === 'string' && it.dueDate.length >= 10)
    .map((it) => ({ it, days: daysUntil(it.dueDate, nowNorm) }))
    .filter(({ days }) => days >= 0)
    .sort((a, b) => {
      if (a.days !== b.days) return a.days - b.days
      const ta = normalizeDueTime(a.it.dueTime) ?? '99:99'
      const tb = normalizeDueTime(b.it.dueTime) ?? '99:99'
      return ta.localeCompare(tb)
    })

  if (upcoming.length > 0) {
    const { it } = upcoming[0]!
    return {
      dateDe: formatDateDe(it.dueDate),
      timeDe: formatDeadlineTimeForMeta(it.dueTime),
      detail: shortenDeadlineTitle(it.title),
    }
  }

  const briefing = String(briefingDeadline ?? '').trim()
  if (briefing) {
    const datePart = briefing.split(',')[0]?.trim() || briefing
    return {
      dateDe: datePart,
      timeDe: parseTimeFromDeadlineText(briefing),
      detail: 'Abgabe',
    }
  }

  return null
}

export function resolveBidOverviewMeta(
  analysis: Pick<DealDeskMockAnalysis, 'executiveBriefing' | 'timelineItems'>,
  owner: DealDeskProjectOwner | null,
): BidOverviewMeta {
  const briefing = analysis.executiveBriefing
  const volumeDisplay = formatBidVolumeDisplay(briefing?.expectedDealVolume ?? null)
  const next = resolveNextRfpDeadline(
    analysis.timelineItems ?? [],
    briefing?.submissionDeadline ?? null,
  )
  const ownerName = owner?.fullName?.trim() || '—'
  const ownerInitials = owner ? initialsFromName(owner.fullName) : '?'

  return {
    volume: volumeDisplay.label,
    volumeIsAiEstimate: volumeDisplay.isAiEstimate,
    location: resolveProjectLocation(briefing),
    nextDeadlineDate: next?.dateDe ?? '—',
    nextDeadlineTime: next?.timeDe ?? null,
    nextDeadlineDetail: next?.detail ?? '',
    ownerName,
    ownerInitials,
    ownerAvatarUrl: owner?.avatarUrl ?? null,
  }
}

/** Relative Countdown-Label für Timeline-Zeilen (ohne Klammern). */
export function formatRelativeCountdownLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days)
    return `Vor ${n} Tag${n === 1 ? '' : 'en'}`
  }
  if (days === 0) return 'Heute'
  return `In ${days} Tag${days === 1 ? '' : 'en'}`
}

/** Titel-Spalte: kritische Fristen (z. B. Angebotsabgabe) in Rot. */
export function deadlineRowTitleClass(days: number, title: string): string {
  const kind = getTimelineItemKind(title)
  const critical = days >= 0 && (days < 3 || (kind === 'submission' && days < 20))
  return cn(
    'min-w-0 truncate text-sm font-semibold leading-none',
    critical ? 'text-red-600' : 'text-foreground',
  )
}

/** Countdown-Badge rechts: Rot < 3 Tage, Orange < 10, sonst Grau. */
export function deadlineCountdownBadgeClass(days: number): string {
  if (days < 0) {
    return 'inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground'
  }
  if (days < 3) {
    return 'inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-red-700 dark:bg-red-950/40 dark:text-red-300'
  }
  if (days < 10) {
    return 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
  }
  return 'inline-flex rounded-full bg-muted/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground'
}
