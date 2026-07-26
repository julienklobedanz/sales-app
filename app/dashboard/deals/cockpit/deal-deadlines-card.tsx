'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight01Icon, CirclePlus, FileDownloadIcon, PencilEdit01Icon, Trash2 } from '@hugeicons/core-free-icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  pickNextDeadline,
  type DealDeadlineRow,
} from '@/lib/deals/deadline-display'
import type { OrgDateDisplayFormat } from '@/lib/format'
import {
  dealDeadlinesExportableForIcs,
  downloadDealDeadlinesIcs,
} from '@/lib/deals/deal-deadline-ics'
import { DEAL_DEADLINE_KIND_LABELS, type DealDeadlineKind } from '@/lib/deals/deadline-types'

import {
  createDealDeadlineManual,
  suppressDealDeadlineAction,
  updateDealDeadlineAction,
} from '../deadline-actions'

const KIND_OPTIONS = Object.entries(DEAL_DEADLINE_KIND_LABELS) as [DealDeadlineKind, string][]

export function DealDeadlinesCard({
  dealId,
  dealTitle,
  deadlines,
  orgDateDisplayFormat = 'de-DE',
}: {
  dealId: string
  dealTitle: string
  deadlines: DealDeadlineRow[]
  orgDateDisplayFormat?: OrgDateDisplayFormat
}) {
  const [expanded, setExpanded] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DealDeadlineRow | null>(null)

  const sorted = useMemo(() => {
    return [...deadlines].sort((a, b) => {
      if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
      if (a.due_at) return -1
      if (b.due_at) return 1
      return a.label.localeCompare(b.label)
    })
  }, [deadlines])

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
    downloadDealDeadlinesIcs({ dealId, dealTitle, deadlines: sorted })
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
                    <div className="text-sm text-muted-foreground">{COPY.deals.cockpit.deadlinesEmpty}</div>
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
                    const res = await createDealDeadlineManual({ dealId, ...values })
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
              <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.deadlinesEmptyHint}</p>
            ) : (
              <ul className="space-y-0 pl-7">
                {sorted.map((d) => {
                  const rowParts = formatDeadlineRowParts(d, {
                    dateDisplayFormat: orgDateDisplayFormat,
                  })
                  return (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-start gap-2 border-t border-dashed py-2.5 first:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{rowParts.labelDate}</div>
                      {rowParts.countdown ? (
                        <div className="text-sm tabular-nums text-muted-foreground">
                          {rowParts.countdown}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {d.source === 'manual' ? 'Manuell' : 'RFP'}
                    </Badge>
                    {d.pinned ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Angepasst
                      </Badge>
                    ) : null}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setEditTarget(d)}
                      >
                        <AppIcon icon={PencilEdit01Icon} size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={async () => {
                          const res = await suppressDealDeadlineAction({
                            dealId,
                            deadlineId: d.id,
                          })
                          if (!res.success) toast.error(res.error ?? 'Löschen fehlgeschlagen.')
                          else toast.success('Termin entfernt.')
                        }}
                      >
                        <AppIcon icon={Trash2} size={14} />
                      </Button>
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
                  dealId,
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
        <Input id="dl-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
        <Button type="button" onClick={() => void handleSubmit()} disabled={saving || !label.trim()}>
          {saving ? 'Speichern …' : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  )
}