'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateUtcDe } from '@/lib/format'
import { formatRelativeTimeDe } from '@/lib/relative-time-de'
import { ROUTES } from '@/lib/routes'
import type { AccountDealRow } from './actions'
import type { CompanyDetailClientProps } from './company-detail-types'

function signalSourceHref(url: string | null, label: string) {
  const u = String(url ?? '').trim()
  if (u && /^https?:\/\//i.test(u)) return u
  const q = label.trim()
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

function smartMatchHref(activeDeals: AccountDealRow[]): string {
  const deal = activeDeals[0]
  if (deal?.id) return ROUTES.matchWithDeal(deal.id)
  return ROUTES.match
}

export function CompanyDetailSignalStrip({
  marketSignals,
  activeDeals,
}: {
  marketSignals: CompanyDetailClientProps['marketSignals']
  activeDeals: AccountDealRow[]
}) {
  const latest = marketSignals.accountNews[0]

  if (!latest) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine aktuellen Marktsignale für diesen Account.
      </p>
    )
  }

  const sourceLabel = latest.sourceLabel?.trim() || 'News'
  const publishedIso = `${latest.publishedOn}T12:00:00.000Z`
  const when = formatRelativeTimeDe(publishedIso)
  const href = signalSourceHref(
    latest.sourceUrl,
    `${sourceLabel} ${latest.body}`.trim()
  )

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Zap className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200/80">
            {sourceLabel} · {when}
            <span className="font-normal text-muted-foreground">
              {' '}
              ({formatDateUtcDe(publishedIso)})
            </span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{latest.body}</p>
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Quelle öffnen
          </Link>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0 self-start sm:self-center">
        <Link href={smartMatchHref(activeDeals)}>Mit Beweis reagieren</Link>
      </Button>
    </div>
  )
}
