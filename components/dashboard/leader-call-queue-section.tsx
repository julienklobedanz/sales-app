'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  DashboardSectionCard,
  HonestEmpty,
} from '@/components/dashboard/dashboard-home-primitives'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CompanyLogo } from '@/components/ui/company-logo'
import type { AdminDashboardModel } from '@/app/(app)/dashboard-home-data'
import {
  leaderCallQueueCompleteAction,
  leaderCallQueueSnoozeAction,
} from '@/app/(app)/dashboard-home-actions'
import { COPY } from '@/lib/copy'
import { formatCopy } from '@/lib/dashboard-home/copy-format'
import { cn } from '@/lib/utils'

function LeaderCallQueueRow({
  row,
  onDismiss,
}: {
  row: AdminDashboardModel['callQueue'][number]
  onDismiss: (signalKey: string) => void
}) {
  const c = COPY.dashboard.home.salesLeader
  const [pending, setPending] = useState<'snooze' | 'done' | null>(null)

  async function handleSnooze() {
    setPending('snooze')
    try {
      const res = await leaderCallQueueSnoozeAction(row.signalKey)
      if (!res.success) {
        toast.error('error' in res ? res.error : 'Konnte nicht verschieben.')
        return
      }
      toast.success('In einer Woche wieder vorgeschlagen.')
      onDismiss(row.signalKey)
    } finally {
      setPending(null)
    }
  }

  async function handleDone() {
    setPending('done')
    try {
      const res = await leaderCallQueueCompleteAction(row.signalKey)
      if (!res.success) {
        toast.error('error' in res ? res.error : 'Konnte nicht speichern.')
        return
      }
      toast.success('Aus der Anruf-Liste entfernt.')
      onDismiss(row.signalKey)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <div className="flex min-w-0 gap-2 lg:col-span-2">
          <CompanyLogo
            src={row.companyLogoUrl}
            companyId={row.companyId}
            fallbackText={row.companyName}
            containerClassName="size-9 shrink-0 rounded-md"
            fallbackIconSize={18}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {c.callQueueColAccount}
            </p>
            <Link href={row.accountHref} className="text-sm font-medium hover:underline">
              {row.companyName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{row.dealTitle}</p>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {c.callQueueColSignal}
          </p>
          <p className="text-sm leading-snug">{row.signalLabel}</p>
          {row.personName ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{row.personName}</p>
          ) : null}
        </div>

        <div className="min-w-0 lg:col-span-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {c.callQueueColReference}
          </p>
          {row.referenceTitle ? (
            <Card
              className={cn(
                'px-2.5 py-2',
                !row.perfectReference && 'italic text-muted-foreground',
              )}
            >
              <Link
                href={row.referenceHref ?? row.matchHref}
                className={cn(
                  'text-sm font-medium hover:underline',
                  !row.perfectReference && 'text-foreground/80 not-italic',
                )}
              >
                {row.referenceTitle}
              </Link>
              {row.referenceSimilarity != null ? (
                <p className="text-xs not-italic text-muted-foreground">
                  {formatCopy(c.callQueueRefScore, {
                    n: Math.round(row.referenceSimilarity * 100),
                  })}
                  {row.referencePersonMatch ? ` · ${c.callQueueRefPersonHint}` : ''}
                </p>
              ) : null}
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">{c.callQueueNoRef}</p>
          )}
        </div>

        <div className="min-w-0 lg:col-span-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {c.callQueueColWhy}
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-foreground/90">
            {row.whyNowBullets.map((b) => (
              <li key={b.slice(0, 48)}>{b}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={row.dealHref}>{c.callQueueOpenDeal}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={row.matchHref}>{c.callQueueOpenMatch}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={pending != null}
              onClick={handleSnooze}
            >
              {pending === 'snooze' ? '…' : c.callQueueSnooze}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={pending != null}
              onClick={handleDone}
            >
              {pending === 'done' ? '…' : c.callQueueDone}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LeaderCallQueueSection({
  rows: initialRows,
  thin = false,
}: {
  rows: AdminDashboardModel['callQueue']
  thin?: boolean
}) {
  const c = COPY.dashboard.home.salesLeader
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  function handleDismiss(signalKey: string) {
    setRows((prev) => prev.filter((r) => r.signalKey !== signalKey))
    router.refresh()
  }

  return (
    <DashboardSectionCard
      title={c.callQueueTitle}
      count={thin ? undefined : rows.length}
      description={c.callQueueDescription}
      hero
    >
      {thin || rows.length === 0 ? (
        <HonestEmpty
          title={c.callQueueEmptyTitle}
          description={c.callQueueEmptyDescription}
        />
      ) : (
        <div>
          {rows.map((row) => (
            <LeaderCallQueueRow key={row.id} row={row} onDismiss={handleDismiss} />
          ))}
        </div>
      )}
    </DashboardSectionCard>
  )
}
