'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CompanyLogo } from '@/components/ui/company-logo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type {
  CompanySearchHit,
  MeetingPrepSnapshot,
} from '@/lib/meeting-prep/meeting-prep-types'

function formatPrepDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MeetingPrepOverlayDialog({
  open,
  onOpenChange,
  title,
  snapshot,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  snapshot: MeetingPrepSnapshot | null
}) {
  const c = COPY.dashboard.home.salesLeader.meetingPrep

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,720px)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        overlayClassName="bg-black/60"
        showCloseButton
      >
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-3 text-lg">
            {snapshot ? (
              <CompanyLogo
                src={snapshot.company.logoUrl}
                companyId={snapshot.company.id}
                fallbackText={snapshot.company.name}
                containerClassName="size-10 shrink-0 rounded-md"
                fallbackIconSize={20}
              />
            ) : null}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>
            {snapshot
              ? `${c.dialogSubtitle} · ${formatPrepDate(snapshot.generatedAt)}`
              : c.dialogLoading}
          </DialogDescription>
        </DialogHeader>

        {!snapshot ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <AppIcon
              icon={Loader}
              size={28}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {snapshot.talkingPoints.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.sectionTalkingPoints}
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                  {snapshot.talkingPoints.map((p) => (
                    <li key={p.slice(0, 64)}>{p}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.sectionDeals}
              </h3>
              {snapshot.deals.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{c.noDeals}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {snapshot.deals.map((d) => (
                    <li key={d.id}>
                      <Link href={d.href} className="text-sm font-medium hover:underline">
                        {d.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {' '}
                        · {d.linkedCount > 0 ? c.dealWithProof : c.dealNoProof}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.sectionSignals}
              </h3>
              {snapshot.signals.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{c.noSignals}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {snapshot.signals.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                    >
                      <p>{s.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrepDate(s.dateIso)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {snapshot.newsRisks.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.sectionRisks}
                </h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.newsRisks.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/20"
                    >
                      <p className="font-medium">{r.headline}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.sectionReferences}
              </h3>
              {snapshot.references.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{c.noReferences}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {snapshot.references.map((ref) => (
                    <li
                      key={ref.id}
                      className={cn(
                        'rounded-lg border px-3 py-2',
                        ref.similarity >= 0.47
                          ? 'border-border'
                          : 'border-dashed border-muted-foreground/40',
                      )}
                    >
                      <Link
                        href={ref.href}
                        className="text-sm font-medium hover:underline"
                      >
                        {ref.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(ref.similarity * 100)} % Match
                        {ref.snippet ? ` · ${ref.snippet}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {snapshot.signalReferencePairs.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.sectionSignalRefMap}
                </h3>
                <ul className="mt-2 space-y-2">
                  {snapshot.signalReferencePairs.map((pair, idx) => (
                    <li
                      key={`${pair.referenceId}-${idx}`}
                      className="rounded-lg border border-dashed border-muted-foreground/35 bg-muted/10 px-3 py-2 text-sm"
                    >
                      <p className="text-muted-foreground italic">{pair.signalLabel}</p>
                      <p className="mt-1 font-medium not-italic">
                        → {pair.referenceTitle}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({Math.round(pair.similarity * 100)} %)
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {snapshot.company.accountHref ? (
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={snapshot.company.accountHref}>{c.openAccount}</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {c.noAccount}{' '}
                <Link
                  href={ROUTES.accountsCreate}
                  className="font-medium text-primary hover:underline"
                >
                  {c.createAccount}
                </Link>
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function MeetingPrepCompanyPicker({
  open,
  hits,
  onPick,
  onCancel,
}: {
  open: boolean
  hits: CompanySearchHit[]
  onPick: (hit: CompanySearchHit) => void
  onCancel: () => void
}) {
  const c = COPY.dashboard.home.salesLeader.meetingPrep
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md" overlayClassName="bg-black/60">
        <DialogHeader>
          <DialogTitle>{c.pickAccountTitle}</DialogTitle>
          <DialogDescription>{c.pickAccountDescription}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                onClick={() => onPick(hit)}
              >
                <CompanyLogo
                  src={hit.logoUrl}
                  companyId={hit.id}
                  fallbackText={hit.name}
                  containerClassName="size-8 shrink-0 rounded-md"
                  fallbackIconSize={16}
                />
                <span className="text-sm font-medium">{hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export function useMeetingPrepFlow() {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [overlayTitle, setOverlayTitle] = useState('')
  const [snapshot, setSnapshot] = useState<MeetingPrepSnapshot | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerHits, setPickerHits] = useState<CompanySearchHit[]>([])
  const [pendingQuery, setPendingQuery] = useState('')

  function openWithSnapshot(title: string, snap: MeetingPrepSnapshot) {
    setOverlayTitle(title)
    setSnapshot(snap)
    setOverlayOpen(true)
  }

  function openLoading(title: string) {
    setOverlayTitle(title)
    setSnapshot(null)
    setOverlayOpen(true)
  }

  return {
    overlayOpen,
    setOverlayOpen,
    overlayTitle,
    snapshot,
    openWithSnapshot,
    openLoading,
    pickerOpen,
    setPickerOpen,
    pickerHits,
    setPickerHits,
    pendingQuery,
    setPendingQuery,
  }
}

export async function runCreateMeetingPrep(
  query: string,
  companyId: string | null | undefined,
  flow: ReturnType<typeof useMeetingPrepFlow>,
) {
  const { createMeetingPrepSessionAction } =
    await import('@/app/dashboard/meeting-prep/actions')
  flow.openLoading(query)
  const result = await createMeetingPrepSessionAction({ query, companyId })
  if (!result.success) {
    flow.setOverlayOpen(false)
    if (result.disambiguation?.length) {
      flow.setPendingQuery(query)
      flow.setPickerHits(result.disambiguation)
      flow.setPickerOpen(true)
      return
    }
    toast.error(result.error)
    return
  }
  flow.openWithSnapshot(query, result.snapshot)
}

export async function runLoadMeetingPrepSession(
  sessionId: string,
  title: string,
  flow: ReturnType<typeof useMeetingPrepFlow>,
) {
  const { loadMeetingPrepSessionAction } =
    await import('@/app/dashboard/meeting-prep/actions')
  flow.openLoading(title)
  const result = await loadMeetingPrepSessionAction(sessionId)
  if ('error' in result) {
    flow.setOverlayOpen(false)
    toast.error(result.error)
    return
  }
  flow.openWithSnapshot(result.title, result.snapshot)
}
