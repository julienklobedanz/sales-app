'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowRight01Icon,
  CirclePlus,
  FileDownloadIcon,
  PencilEdit01Icon,
  Trash2,
} from '@hugeicons/core-free-icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import {
  formatDeadlineRowParts,
  formatNextDeadlineHeadline,
  canMarkDeadlineAsSubmissionTarget,
  deadlineDaysUntil,
  pickNextDeadline,
  isTenderOwnedDeadline,
  sortDeadlinesByDueAt,
  type DealDeadlineRow,
} from '@/lib/deals/deadline-display'
import type { OrgDateDisplayFormat } from '@/lib/format'
import {
  dealDeadlinesExportableForIcs,
  downloadDealDeadlinesIcs,
} from '@/lib/deals/deal-deadline-ics'
import {
  DEAL_DEADLINE_KIND_LABELS,
  type DealDeadlineKind,
} from '@/lib/deals/deadline-types'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/routes'

import {
  createDealDeadlineManual,
  suppressDealDeadlineAction,
  updateDealDeadlineAction,
} from '../deadline-actions'
import { setDeadlineSubmissionTargetAction } from '../submission-actions'

const KIND_OPTIONS = Object.entries(DEAL_DEADLINE_KIND_LABELS) as [
  DealDeadlineKind,
  string,
][]

function DeadlineTimelineMarker({
  isFirst,
  isLast,
  tone,
}: {
  isFirst: boolean
  isLast: boolean
  tone: 'past' | 'today' | 'future'
}) {
  return (
    <div className="flex w-4 shrink-0 flex-col items-center self-stretch" aria-hidden>
      <div className={cn('w-px flex-1 bg-border', isFirst && 'opacity-0')} />
      <div
        className={cn(
          'z-[1] size-2.5 shrink-0 rounded-full border-2 bg-background ring-2 ring-card',
          tone === 'past' && 'border-muted-foreground/40 bg-muted',
          tone === 'today' && 'border-amber-500 bg-amber-400/30',
          tone === 'future' && 'border-primary/60 bg-primary/10',
        )}
      />
      <div className={cn('w-px flex-1 bg-border', isLast && 'opacity-0')} />
    </div>
  )
}

function deadlineMarkerTone(d: DealDeadlineRow): 'past' | 'today' | 'future' {
  const days = d.due_at ? deadlineDaysUntil(d) : null
  if (days === null) return 'future'
  if (days < 0) return 'past'
  if (days === 0) return 'today'
  return 'future'
}

export type DeadlineCardOwner =
  | { kind: 'deal'; id: string; title: string }
  | { kind: 'tender'; id: string; title: string }

export function DealDeadlinesCard({
  owner,
  deadlines,
  orgDateDisplayFormat = 'de-DE',
}: {
  owner: DeadlineCardOwner
  deadlines: DealDeadlineRow[]
  orgDateDisplayFormat?: OrgDateDisplayFormat
}) {
  const [expanded, setExpanded] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DealDeadlineRow | null>(null)

  const sorted = useMemo(() => sortDeadlinesByDueAt(deadlines), [deadlines])

  const next = useMemo(() => pickNextDeadline(sorted), [sorted])
  const headline = next
    ? formatNextDeadlineHeadline(next, { dateDisplayFormat: orgDateDisplayFormat })
    : null
  const exportableForIcs = useMemo(() => dealDeadlinesExportableForIcs(sorted), [sorted])

  function handleDownloadIcs() {
    if (exportableForIcs.length === 0) {
      toast.message(COPY.deals.cockpit.downloadDeadlinesIcsEmpty)
      return
    }
    downloadDealDeadlinesIcs({
      dealId: owner.id,
      dealTitle: owner.title,
      deadlines: sorted,
    })
    toast.success('Kalenderdatei wird heruntergeladen.')
  }

  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-start gap-4">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <AppIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
                <div className="min-w-0">
                  {headline ? (
                    <>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {COPY.deals.cockpit.nextDeadlineLabel}
                      </div>
                      <div className="text-lg font-semibold tabular-nums tracking-tight">
                        {headline.title}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {headline.subtitle}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {owner.kind === 'tender'
                        ? COPY.tenders.nextDeadlineEmpty
                        : COPY.deals.cockpit.deadlinesEmpty}
                    </div>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={exportableForIcs.length === 0}
                onClick={handleDownloadIcs}
                aria-label={COPY.deals.cockpit.downloadDeadlinesIcsAria}
                title={COPY.deals.cockpit.downloadDeadlinesIcsAria}
              >
                <AppIcon icon={FileDownloadIcon} size={16} className="mr-1 shrink-0" />
                {COPY.deals.cockpit.downloadDeadlinesIcs}
              </Button>
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="shrink-0">
                    <AppIcon icon={CirclePlus} size={16} className="mr-1" />
                    {COPY.deals.cockpit.addDeadline}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <DeadlineForm
                    title={COPY.deals.cockpit.addDeadline}
                    onSubmit={async (values) => {
                      const res = await createDealDeadlineManual({
                        ...(owner.kind === 'tender'
                          ? { tenderId: owner.id }
                          : { dealId: owner.id }),
                        ...values,
                      })
                      if (!res.success) {
                        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
                        return
                      }
                      toast.success('Termin angelegt.')
                      setAddOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <CollapsibleContent className="mt-4 border-t pt-3">
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.deadlinesEmptyHint}
              </p>
            ) : (
              <ul className="space-y-0">
                {sorted.map((d, index) => {
                  const rowParts = formatDeadlineRowParts(d, {
                    dateDisplayFormat: orgDateDisplayFormat,
                  })
                  const isFirst = index === 0
                  const isLast = index === sorted.length - 1
                  const inherited = owner.kind === 'deal' && isTenderOwnedDeadline(d)
                  return (
                    <li key={d.id} className="group/deadline flex gap-3">
                      <DeadlineTimelineMarker
                        isFirst={isFirst}
                        isLast={isLast}
                        tone={deadlineMarkerTone(d)}
                      />
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2 border-b border-dashed border-border/80 py-3 last:border-b-0">
                        <div
                          className={cn(
                            'min-w-0 flex-1',
                            deadlineMarkerTone(d) === 'past' && 'opacity-60',
                          )}
                        >
                          <div className="text-sm font-medium">{rowParts.labelDate}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {d.source === 'manual' ? 'Manuell' : 'RFP'}
                            </Badge>
                            {inherited ? (
                              <Badge variant="outline" className="text-[10px]">
                                {COPY.tenders.ownedByTender}
                              </Badge>
                            ) : null}
                            {d.pinned ? (
                              <Badge variant="secondary" className="text-[10px]">
                                Angepasst
                              </Badge>
                            ) : null}
                            {canMarkDeadlineAsSubmissionTarget(owner.kind, d) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant={d.is_submission_target ? 'secondary' : 'outline'}
                                className="h-6 px-2 text-[10px]"
                                aria-pressed={d.is_submission_target}
                                onClick={async () => {
                                  const res = await setDeadlineSubmissionTargetAction({
                                    ownerKind: owner.kind,
                                    ownerId: owner.id,
                                    deadlineId: d.id,
                                    isSubmissionTarget: !d.is_submission_target,
                                  })
                                  if (!res.success) {
                                    toast.error(res.error ?? 'Speichern fehlgeschlagen.')
                                  }
                                }}
                              >
                                {COPY.deals.cockpit.submissionItemsMarkTarget}
                              </Button>
                            ) : null}
                            {rowParts.countdown ? (
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {rowParts.countdown}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className={cn(
                            'ml-auto flex items-center gap-1',
                            'opacity-0 transition-opacity',
                            'group-hover/deadline:opacity-100 group-focus-within/deadline:opacity-100',
                          )}
                        >
                          {inherited && d.tender_id ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              asChild
                            >
                              <Link
                                href={ROUTES.tenders.detail(d.tender_id)}
                                aria-label={COPY.deals.cockpit.editInheritedDeadline}
                                title={COPY.deals.cockpit.editInheritedDeadline}
                              >
                                <AppIcon icon={PencilEdit01Icon} size={14} />
                              </Link>
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                aria-label={COPY.deals.cockpit.editDeadline}
                                title={COPY.deals.cockpit.editDeadline}
                                onClick={() => setEditTarget(d)}
                              >
                                <AppIcon icon={PencilEdit01Icon} size={14} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                aria-label={COPY.deals.cockpit.deleteDeadlineAria}
                                title={COPY.deals.cockpit.deleteDeadlineAria}
                                onClick={async () => {
                                  const res = await suppressDealDeadlineAction({
                                    ...(owner.kind === 'tender'
                                      ? { tenderId: owner.id }
                                      : { dealId: owner.id }),
                                    deadlineId: d.id,
                                  })
                                  if (!res.success)
                                    toast.error(res.error ?? 'Löschen fehlgeschlagen.')
                                  else toast.success('Termin entfernt.')
                                }}
                              >
                                <AppIcon icon={Trash2} size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>

      <Dialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.deals.cockpit.editDeadline}</DialogTitle>
          </DialogHeader>
          {editTarget ? (
            <DeadlineForm
              title={COPY.deals.cockpit.editDeadline}
              initial={{
                kind: editTarget.kind as DealDeadlineKind,
                label: editTarget.label,
                dueDate: editTarget.due_at?.slice(0, 10) ?? '',
                dueText: editTarget.due_text ?? '',
              }}
              submitLabel="Speichern"
              onSubmit={async (values) => {
                const res = await updateDealDeadlineAction({
                  ...(owner.kind === 'tender'
                    ? { tenderId: owner.id }
                    : { dealId: owner.id }),
                  deadlineId: editTarget.id,
                  source: editTarget.source,
                  ...values,
                })
                if (!res.success) {
                  toast.error(res.error ?? 'Speichern fehlgeschlagen.')
                  return
                }
                toast.success('Termin aktualisiert.')
                setEditTarget(null)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function DeadlineForm({
  title,
  initial,
  submitLabel = 'Anlegen',
  onSubmit,
}: {
  title: string
  initial?: {
    kind: DealDeadlineKind
    label: string
    dueDate: string
    dueText: string
  }
  submitLabel?: string
  onSubmit: (values: {
    kind: DealDeadlineKind
    label: string
    dueDate?: string | null
    dueText?: string | null
  }) => Promise<void>
}) {
  const [kind, setKind] = useState<DealDeadlineKind>(initial?.kind ?? 'custom')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [dueText, setDueText] = useState(initial?.dueText ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSubmit({
        kind,
        label,
        dueDate: dueDate.trim() || null,
        dueText: dueText.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="space-y-2">
        <Label>Art</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as DealDeadlineKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map(([k, lbl]) => (
              <SelectItem key={k} value={k}>
                {lbl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dl-label">Bezeichnung</Label>
        <Input id="dl-label" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dl-date">Datum (optional)</Label>
        <Input
          id="dl-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dl-text">Fuzzy-Text (optional)</Label>
        <Input
          id="dl-text"
          value={dueText}
          onChange={(e) => setDueText(e.target.value)}
          placeholder="z. B. Q3 2026"
        />
      </div>
      <DialogFooter className="gap-2 sm:justify-end px-0">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving || !label.trim()}
        >
          {saving ? 'Speichern …' : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  )
}
