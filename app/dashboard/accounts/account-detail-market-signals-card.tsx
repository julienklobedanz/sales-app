'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatReferenceDate } from '@/lib/format'
import { COPY } from '@/lib/copy'

export type AccountDetailMarketSignals = {
  championMoves: Array<{
    id: string
    personName: string
    personTitleBefore: string | null
    personTitleAfter: string | null
    changeSummary: string
    detectedAt: string
    eventKind: 'role_change' | 'news_mention'
    sourceUrl: string | null
  }>
  accountNews: Array<{
    id: string
    body: string
    sourceLabel: string | null
    sourceUrl: string | null
    publishedOn: string
    segment: 'customer' | 'prospect'
  }>
}

type Props = {
  marketSignals: AccountDetailMarketSignals
}

export function AccountDetailMarketSignalsCard({ marketSignals }: Props) {
  const [visibleChampionCount, setVisibleChampionCount] = useState(3)
  const [visibleNewsCount, setVisibleNewsCount] = useState(3)

  function newsSourceHref(
    row: AccountDetailMarketSignals['accountNews'][number],
  ) {
    const url = String(row.sourceUrl ?? '').trim()
    if (url && /^https?:\/\//i.test(url)) return url
    const source = String(row.sourceLabel ?? '').trim()
    if (/^https?:\/\//i.test(source)) return source
    const q = [source, row.body].filter(Boolean).join(' ')
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`
  }

  function championHref(
    row: AccountDetailMarketSignals['championMoves'][number],
  ) {
    const url = String(row.sourceUrl ?? '').trim()
    if (row.eventKind === 'news_mention' && url && /^https?:\/\//i.test(url)) return url
    const search = `${row.personName} ${row.personTitleAfter ?? ''}`.trim()
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(search)}`
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Marktsignal-Historie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-muted/5 p-4">
            <h4 className="text-sm font-semibold">Executive Tracking</h4>
            {marketSignals.championMoves.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Kein Executive Tracking vorhanden.
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-2">
                  {marketSignals.championMoves
                    .slice(0, visibleChampionCount)
                    .map((row) => (
                      <li
                        key={row.id}
                        className="rounded-md border border-border/70 bg-card px-3 py-2"
                      >
                        <Link
                          href={championHref(row)}
                          target="_blank"
                          rel="noreferrer"
                          className="block hover:opacity-90"
                        >
                          <p className="text-sm font-medium leading-snug">
                            {row.personName}
                            {row.eventKind === 'news_mention' ? (
                              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                Presse
                              </span>
                            ) : null}
                            {row.personTitleAfter ? ` → ${row.personTitleAfter}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {row.changeSummary ||
                              (row.eventKind === 'news_mention'
                                ? 'Erwähnung in den Medien'
                                : 'Positionswechsel erkannt')}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {row.detectedAt
                              ? formatReferenceDate(row.detectedAt, 'de-DE')
                              : '—'}
                          </p>
                        </Link>
                      </li>
                    ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {marketSignals.championMoves.length > visibleChampionCount ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setVisibleChampionCount((prev) => prev + 3)}
                    >
                      Mehr anzeigen
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/5 p-4">
            <h4 className="text-sm font-semibold">{COPY.marketSignals.newsSection}</h4>
            {marketSignals.accountNews.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {COPY.accounts.companyUpdateEmpty}
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-2">
                  {marketSignals.accountNews.slice(0, visibleNewsCount).map((row) => (
                    <li
                      key={row.id}
                      className="rounded-md border border-border/70 bg-card px-3 py-2"
                    >
                      <Link
                        href={newsSourceHref(row)}
                        target="_blank"
                        rel="noreferrer"
                        className="block hover:opacity-90"
                      >
                        <p className="text-sm leading-snug">{row.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.publishedOn
                            ? formatReferenceDate(row.publishedOn, 'de-DE')
                            : '—'}
                          {row.sourceLabel ? ` · ${row.sourceLabel}` : ''}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {marketSignals.accountNews.length > visibleNewsCount ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setVisibleNewsCount((prev) => prev + 3)}
                    >
                      Mehr anzeigen
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
