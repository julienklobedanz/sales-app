'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Bell, Building2, ExternalLink, MailOpen, News01Icon, Sparkles, UploadIcon } from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { markMarketSignalNotificationsRead } from '@/app/dashboard/market-signals/actions'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { formatDateUtcDe } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import type { AccountNewsRow, MarketSignalsCompanyOption } from '@/app/dashboard/market-signals/data'

const PAGE_SIZE = 10

function publishedLabel(dateStr: string) {
  const iso = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00.000Z`
  return formatDateUtcDe(iso)
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function extractHeadline(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Neues Signal'
  if (compact.length <= 120) return compact
  return `${compact.slice(0, 117)}...`
}

function inferSignalTags(body: string) {
  const text = normalizeText(body)
  const tags: Array<{ label: string; className: string }> = []
  if (/(funding|finanzierung|serie [abc]|seed|kapitalrunde)/i.test(text)) {
    tags.push({ label: 'Funding', className: 'bg-blue-600/10 text-blue-600 border-0' })
  }
  if (/(akquisition|übernahme|merger|m&a|fusion)/i.test(text)) {
    tags.push({ label: 'M&A', className: 'bg-slate-100 text-slate-700 border-0' })
  }
  if (/(expansion|expandiert|neuer standort|international)/i.test(text)) {
    tags.push({ label: 'Expansion', className: 'bg-slate-100 text-slate-700 border-0' })
  }
  if (tags.length === 0) {
    tags.push({ label: 'Update', className: 'bg-slate-100 text-slate-600 border-0' })
  }
  return tags
}

export function AccountNewsFeed({
  items,
  companies,
  followingCompanyIds,
  initialReadKeys,
  restrictedCompanyIds,
}: {
  items: AccountNewsRow[]
  companies: MarketSignalsCompanyOption[]
  followingCompanyIds: string[]
  initialReadKeys: string[]
  restrictedCompanyIds?: string[]
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [readKeys, setReadKeys] = useState(() => new Set(initialReadKeys.filter((k) => k.startsWith('market_news:'))))
  const followSet = useMemo(() => new Set(followingCompanyIds), [followingCompanyIds])
  const topTargetCompanyIds = useMemo(() => {
    const newestByCompany = new Map<string, number>()
    for (const item of items) {
      const ts = new Date(item.publishedOn).getTime()
      const prev = newestByCompany.get(item.companyId) ?? 0
      if (ts > prev) newestByCompany.set(item.companyId, ts)
    }
    return companies
      .slice()
      .sort((a, b) => {
        if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1
        return (newestByCompany.get(b.id) ?? 0) - (newestByCompany.get(a.id) ?? 0)
      })
      .slice(0, 10)
      .map((company) => company.id)
  }, [companies, items])
  const topTargetSet = useMemo(() => new Set(topTargetCompanyIds), [topTargetCompanyIds])

  const restrictedSet = useMemo(
    () => (restrictedCompanyIds?.length ? new Set(restrictedCompanyIds) : null),
    [restrictedCompanyIds]
  )

  const prioritized = useMemo(() => {
    return items
      .filter((item) => topTargetSet.has(item.companyId))
      .filter((item) => (restrictedSet ? restrictedSet.has(item.companyId) : true))
      .sort((a, b) => {
        const aFollow = followSet.has(a.companyId)
        const bFollow = followSet.has(b.companyId)
        if (aFollow !== bFollow) return aFollow ? -1 : 1
        return new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime()
      })
  }, [followSet, items, topTargetSet, restrictedSet])
  const visibleItems = prioritized.slice(0, visibleCount)
  const visibleReadKeys = useMemo(() => visibleItems.map((row) => `market_news:${row.id}`), [visibleItems])

  async function handleMarkRead() {
    if (!visibleReadKeys.length) return
    const next = new Set(readKeys)
    visibleReadKeys.forEach((key) => next.add(key))
    setReadKeys(next)
    const result = await markMarketSignalNotificationsRead(visibleReadKeys)
    if (!result.success) toast.error(result.error ?? 'Konnte News nicht als gelesen markieren')
  }

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold text-slate-950">{COPY.marketSignals.newsSection}</CardTitle>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="toolbar"
            className="h-9 w-9 px-0 text-slate-500 hover:bg-muted/70"
            onClick={handleMarkRead}
            aria-label="Account News als gelesen markieren"
          >
            <AppIcon icon={MailOpen} size={16} />
          </Button>
          <Button variant="ghost" size="toolbar" className="h-9 px-3 text-slate-500 hover:bg-muted/70" asChild>
            <Link href={ROUTES.settings}>
              <AppIcon icon={Bell} size={15} />
              Benachrichtigungen
            </Link>
          </Button>
          <Button variant="ghost" size="toolbar" className="h-9 px-3 text-slate-500 hover:bg-muted/70" asChild>
            <Link href={ROUTES.marketSignalsManage}>{COPY.marketSignals.manage}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm">
            <p className="font-medium text-foreground">{COPY.marketSignals.newsEmptyTitle}</p>
            <p className="mt-1 text-muted-foreground">{COPY.marketSignals.newsEmptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleItems.map((row) => (
              <li
                key={row.id}
                className={`flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-start sm:justify-between ${
                  readKeys.has(`market_news:${row.id}`) ? 'opacity-55' : ''
                }`}
              >
                <div className="flex min-w-0 gap-3.5">
                  <div className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/35">
                    {row.companyLogoUrl ? (
                      <Image src={row.companyLogoUrl} alt="" fill sizes="40px" className="object-contain p-1.5" />
                    ) : (
                      <AppIcon icon={News01Icon} size={16} className="text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {inferSignalTags(row.body).map((tag) => (
                        <Badge key={`${row.id}-${tag.label}`} className={tag.className}>
                          {tag.label}
                        </Badge>
                      ))}
                      <span className="text-xs text-slate-500">{publishedLabel(row.publishedOn)}</span>
                    </div>
                    <p className="text-sm font-semibold leading-snug text-slate-950">
                      {extractHeadline(row.body)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{row.companyName}</span>
                      {row.sourceLabel ? (
                        <>
                          <span aria-hidden>•</span>
                          <span className="inline-flex items-center gap-1">
                            <AppIcon icon={ExternalLink} size={14} />
                            {COPY.marketSignals.sourcePrefix}: {row.sourceLabel}
                          </span>
                        </>
                      ) : null}
                      {followSet.has(row.companyId) ? (
                        <>
                          <span aria-hidden>•</span>
                          <span className="text-blue-600">Following</span>
                        </>
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">{row.body}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    title="In Deal vermerken"
                    aria-label="In Deal vermerken"
                  >
                    <AppIcon icon={UploadIcon} size={15} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    title="Gratulieren"
                    aria-label="Gratulieren"
                    asChild
                  >
                    <Link
                      href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(row.companyName)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <AppIcon icon={Sparkles} size={15} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    asChild
                  >
                    <Link href={ROUTES.accountsDetail(row.companyId)} aria-label="Zum Account">
                      <AppIcon icon={Building2} size={16} />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {prioritized.length > visibleCount ? (
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="ghost"
              size="toolbar"
              className="h-9 text-slate-500 hover:bg-muted/70"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              {COPY.marketSignals.loadMore}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
