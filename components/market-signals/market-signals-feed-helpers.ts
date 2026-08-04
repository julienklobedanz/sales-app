import type {
  AccountNewsRow,
  ExecutiveTrackingRow,
} from '@/app/dashboard/market-signals/data'
import { sanitizeCompellingEventForDisplay } from '@/lib/market-signals/compelling-event'
import { formatSignalSourceLabel } from '@/lib/market-signals/leadership-move'
import type { MarketSignalBadge } from '@/lib/market-signals/signal-badge'
import { formatRoleChangeFact } from '@/lib/market-signals/signal-intelligence'

export const PAGE_SIZE = 10

export type FeedSort = 'relevance' | 'date'

export type FeedItem = {
  key: string
  readKey: string
  kind: 'exec' | 'news'
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  at: string
  badge: MarketSignalBadge
  headline: string
  compellingEvent: string | null
  sourceLabel: string
  sourceUrl: string | null
  personName: string | null
  isChampion: boolean
  dealCount: number
  dealHref: string | null
  relevanceScore: number
}

const COMPELLING_EVENT_MAX = 180

export function clampCompellingEvent(raw: string | null | undefined): string | null {
  return sanitizeCompellingEventForDisplay(raw, COMPELLING_EVENT_MAX)
}

export function relativeTimeLabel(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffMs = Date.now() - t
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return 'Heute'
  if (days === 1) return 'Gestern'
  return `vor ${days} Tagen`
}

export function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function sourceHostLabel(
  url: string | null | undefined,
  fallback: string | null | undefined,
  hintTexts: Array<string | null | undefined> = [],
  companyName?: string | null
) {
  return formatSignalSourceLabel({
    url,
    sourceLabel: fallback,
    title: hintTexts.filter(Boolean).join(' - '),
    companyName,
  })
}

export function resolveSourceUrl(url: string | null | undefined, fallbackQuery: string) {
  const raw = String(url ?? '').trim()
  if (raw && /^https?:\/\//i.test(raw)) return raw
  return `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}`
}

/** Move bei Rollenwechsel; Leadership-Titel auch ohne gespeicherte Titles → Move. */
export function execHeadline(row: ExecutiveTrackingRow) {
  const insight = row.insightSignalFact?.trim()
  if (insight) return insight
  return formatRoleChangeFact({
    personName: row.personName,
    personTitleBefore: row.personTitleBefore,
    personTitleAfter: row.personTitleAfter,
    companyName: row.companyName,
    changeSummary: row.changeSummary,
  })
}

export function newsHeadline(row: AccountNewsRow) {
  const insight = row.insightSignalFact?.trim()
  if (insight) return insight
  const compact = row.body.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Neues Signal'
  if (compact.length <= 140) return compact
  return `${compact.slice(0, 137)}…`
}

export function badgeClass(badge: MarketSignalBadge) {
  if (badge === 'Move') return 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-0'
  if (badge === 'Executive') return 'bg-violet-600/10 text-violet-700 dark:text-violet-300 border-0'
  return 'bg-muted text-foreground border-0'
}

export function toMs(iso: string) {
  const value = iso.includes('T') ? iso : `${iso}T12:00:00.000Z`
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}
