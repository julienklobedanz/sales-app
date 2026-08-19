'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Building2, ExternalLink, MoreHorizontal } from '@hugeicons/core-free-icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Hinweis } from '@/components/ui/hinweis'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import type { SignalMatchHit } from '@/lib/market-signals/signal-reference-match'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import {
  badgeClass,
  relativeTimeLabel,
  resolveSourceUrl,
  type FeedItem,
} from './market-signals-feed-helpers'

export function MarketSignalsFeedItem({
  item,
  unread,
  matchCount,
  onOpenOutreach,
  onHideSignal,
  onMarkRead,
  onCopyLink,
}: {
  item: FeedItem
  unread: boolean
  matchCount: number
  onOpenOutreach: (item: FeedItem) => void
  onHideSignal: (readKey: string) => void
  onMarkRead: (readKey: string) => void
  onCopyLink: (item: FeedItem) => void
}) {
  const sourceHref = resolveSourceUrl(
    item.sourceUrl,
    [item.sourceLabel, item.companyName, item.headline].filter(Boolean).join(' '),
  )
  const dealLabel =
    item.dealCount > 0
      ? (item.dealCount === 1
          ? COPY.marketSignals.dealCountSingular
          : COPY.marketSignals.dealCountPlural
        ).replace('{count}', String(item.dealCount))
      : null
  const linkedInUrl = item.personName
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        `${item.personName} ${item.companyName}`,
      )}`
    : null

  return (
    <li>
      <Card
        className={cn(
          'p-4 transition-opacity',
          unread ? undefined : 'opacity-45',
        )}
      >
      <div className="flex gap-3.5">
        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/40">
          {item.companyLogoUrl ? (
            <Image
              src={item.companyLogoUrl}
              alt=""
              fill
              sizes="44px"
              className="object-contain p-1.5"
            />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              {(item.companyName || '?').slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge className={badgeClass(item.badge)}>
                {item.badge === 'Move'
                  ? COPY.marketSignals.signalTypeMove
                  : item.badge === 'Executive'
                    ? COPY.marketSignals.signalTypeExec
                    : COPY.marketSignals.signalTypeCompany}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {relativeTimeLabel(item.at)}
              </span>
            </div>
            {unread ? (
              <span
                className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                title={COPY.marketSignals.newBadge}
                aria-label={COPY.marketSignals.newBadge}
              />
            ) : null}
          </div>

          <p className="text-sm font-semibold leading-snug text-foreground">
            {item.headline}
          </p>

          {item.compellingEvent ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {COPY.marketSignals.compellingEventLabel}:
              </span>{' '}
              {item.compellingEvent}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{item.companyName}</span>
            {matchCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  className="font-medium text-foreground/80 hover:text-foreground hover:underline"
                  onClick={() => onOpenOutreach(item)}
                >
                  {matchCount === 1
                    ? COPY.marketSignals.matchingRefsSingular
                    : COPY.marketSignals.matchingRefsPlural.replace(
                        '{count}',
                        String(matchCount),
                      )}
                </button>
              </>
            ) : null}
            {dealLabel && item.dealHref ? (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={item.dealHref}
                  className="font-medium text-foreground/80 hover:text-foreground hover:underline"
                >
                  {dealLabel}
                </Link>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <Link
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
            >
              {item.sourceLabel}
              <AppIcon icon={ExternalLink} size={12} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenOutreach(item)}
            >
              {COPY.marketSignals.outreachCta}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              asChild
            >
              <Link href={ROUTES.accountsDetail(item.companyId)}>
                <AppIcon icon={Building2} size={14} className="mr-1" />
                {COPY.marketSignals.openAccount}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground"
                  aria-label="Weitere Aktionen"
                >
                  <AppIcon icon={MoreHorizontal} size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onHideSignal(item.readKey)}>
                  {COPY.marketSignals.menuHide}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!unread}
                  onSelect={() => onMarkRead(item.readKey)}
                >
                  {COPY.marketSignals.menuMarkRead}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCopyLink(item)}>
                  {COPY.marketSignals.menuCopyLink}
                </DropdownMenuItem>
                {linkedInUrl ? (
                  <DropdownMenuItem asChild>
                    <a href={linkedInUrl} target="_blank" rel="noreferrer">
                      {COPY.marketSignals.menuLinkedIn}
                    </a>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      </Card>
    </li>
  )
}

export function MarketSignalsOutreachDialog({
  open,
  onOpenChange,
  title,
  loading,
  text,
  onTextChange,
  matches,
  selectedIds,
  baseReady,
  onToggleMatch,
  onCopy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  loading: boolean
  text: string
  onTextChange: (value: string) => void
  matches: SignalMatchHit[]
  selectedIds: string[]
  baseReady: boolean
  onToggleMatch: (id: string, checked: boolean) => void
  onCopy: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{COPY.marketSignals.outreachDialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground line-clamp-2">{title}</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
          <Textarea
            value={loading ? COPY.marketSignals.outreachGenerating : text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={14}
            disabled={loading}
            className="min-h-[280px] font-mono text-sm"
          />
          <Hinweis className="p-3">
            <p className="text-xs font-semibold text-foreground">
              {COPY.marketSignals.outreachMatchingRefsTitle}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {COPY.marketSignals.outreachMatchingRefsHint}
            </p>
            {matches.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {COPY.marketSignals.outreachMatchingRefsEmpty}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {matches.map((hit) => {
                  const checked = selectedIds.includes(hit.id)
                  return (
                    <li key={hit.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`outreach-ref-${hit.id}`}
                        checked={checked}
                        disabled={loading || !baseReady}
                        onCheckedChange={(value) => onToggleMatch(hit.id, value === true)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`outreach-ref-${hit.id}`}
                        className="min-w-0 cursor-pointer text-xs leading-snug"
                      >
                        <span className="font-medium text-foreground">{hit.title}</span>
                        {hit.companyName ? (
                          <span className="mt-0.5 block text-muted-foreground">
                            {hit.companyName}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </Hinweis>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {COPY.marketSignals.outreachClose}
          </Button>
          <Button type="button" disabled={loading || !text.trim()} onClick={onCopy}>
            {COPY.marketSignals.outreachCopy}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
