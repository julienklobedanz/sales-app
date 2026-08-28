import { COPY } from '@/lib/copy'
import { formatCopy } from '@/lib/dashboard-home/copy-format'
import type {
  DashboardQueueTone,
  SalesRepDashboardModel,
} from '@/lib/dashboard-home/dashboard-home-types'
import { formatDealVolume } from '@/lib/format'
import { dealMatchHref } from '@/lib/deals/deal-match-href'
import { ROUTES } from '@/lib/routes'

type QueueTone = DashboardQueueTone

export type SalesRepQueueItem = {
  id: string
  tone: QueueTone
  title: string
  meta?: string
  ctaLabel: string
  href: string
}

const PARTIAL_MATCH_CUTOFF = 0.47
const c = () => COPY.dashboard.home.salesRep

function daysUntilExpiry(date: string | null, refDate = new Date()): number | null {
  if (!date?.trim()) return null
  const end = new Date(`${date}T12:00:00`)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date(refDate)
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function formatDealDeadline(deal: SalesRepDashboardModel['activeDeals'][number]): string {
  const copy = c()
  if (deal.deadline.text && !deal.deadline.date) return deal.deadline.text
  const days = daysUntilExpiry(deal.deadline.date)
  if (days == null) return copy.dealOpen
  if (days < 0) return copy.dealOverdue
  if (days === 0) return copy.dealToday
  if (days === 1) return copy.dealInOneDay
  if (days < 14) return formatCopy(copy.dealInDays, { n: days })
  const weeks = Math.round(days / 7)
  return weeks === 1 ? copy.dealInOneWeek : formatCopy(copy.dealInWeeks, { n: weeks })
}

function dealLabel(deal: SalesRepDashboardModel['activeDeals'][number]): string {
  const company = deal.company_name ?? deal.title
  return `${company} · ${formatDealDeadline(deal)}`
}

export function buildSalesRepQueue(data: SalesRepDashboardModel): SalesRepQueueItem[] {
  const copy = c()
  const items: SalesRepQueueItem[] = []

  const gapDeals = [...data.activeDeals]
    .filter((d) => d.linkedCount === 0)
    .sort((a, b) => {
      const da = daysUntilExpiry(a.deadline.date) ?? 9999
      const db = daysUntilExpiry(b.deadline.date) ?? 9999
      return da - db
    })

  for (const deal of gapDeals) {
    items.push({
      id: `deal-gap-${deal.id}`,
      tone: 'gap',
      title: `${deal.company_name ?? deal.title} — ${copy.queueNoProof}`,
      meta: dealLabel(deal),
      ctaLabel: copy.queueFindProof,
      href: dealMatchHref(deal.id),
    })
  }

  const warnDeals = data.activeDeals.filter(
    (d) =>
      d.linkedCount > 0 &&
      (d.bestMatchScore == null ||
        d.bestMatchScore < PARTIAL_MATCH_CUTOFF ||
        d.linkedCount === 1),
  )
  for (const deal of warnDeals) {
    if (items.some((i) => i.href === dealMatchHref(deal.id))) continue
    items.push({
      id: `deal-warn-${deal.id}`,
      tone: 'warn',
      title: `${deal.company_name ?? deal.title} — ${copy.queueWeakProof}`,
      meta: [deal.volume ? formatDealVolume(deal.volume) : null, dealLabel(deal)]
        .filter(Boolean)
        .join(' · '),
      ctaLabel: copy.queueFindProof,
      href: dealMatchHref(deal.id),
    })
  }

  const seenIntentKeys = new Set<string>()
  for (const intent of data.liveIntent.slice(0, 4)) {
    const href = intent.href ?? ROUTES.accounts
    const dedupeKey = `${href}::${intent.text}`
    if (seenIntentKeys.has(dedupeKey)) continue
    seenIntentKeys.add(dedupeKey)
    items.push({
      id: `intent-${intent.id}`,
      tone: 'intent',
      title: intent.text,
      meta: copy.queueHotSignal,
      ctaLabel: copy.queueFollowUp,
      href,
    })
  }

  if (data.dueSnoozesCount > 0) {
    items.push({
      id: 'snooze-due',
      tone: 'neutral',
      title: `${data.dueSnoozesCount} ${copy.queueSnoozeBack}`,
      meta: copy.queueSnoozeDue,
      ctaLabel: copy.queueReview,
      href: ROUTES.accounts,
    })
  }

  return items.slice(0, 8)
}
