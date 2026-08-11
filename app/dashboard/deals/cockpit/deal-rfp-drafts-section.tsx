'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { AiDraftSheet } from '@/app/dashboard/deals/components/ai-draft-sheet'
import type { DealWithReferences } from '@/app/dashboard/deals/types'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import type { DealDeskDraftRow } from '@/lib/deal-desk/mock-analysis'
import { buildDealContextForAiDraft } from '@/lib/deals/build-deal-context-for-ai-draft'
import {
  draftRowStatus,
  sortDraftRowsByCriticality,
} from '@/lib/deals/sort-draft-rows-by-criticality'
import { cn } from '@/lib/utils'

import { updateDealRfpDraftAnswer } from './deal-rfp-draft-actions'

export { draftRowStatus } from '@/lib/deals/sort-draft-rows-by-criticality'

const VISIBLE_DRAFTS_DEFAULT = 5

export function draftStatusLabel(status: 'ready' | 'draft' | 'gap'): string {
  if (status === 'ready') return COPY.deals.cockpit.draftsStatusReady
  if (status === 'draft') return COPY.deals.cockpit.draftsStatusDraft
  return COPY.deals.cockpit.draftsStatusGap
}

type ActiveKi = {
  row: DealDeskDraftRow
  referenceId: string
  referenceTitle: string
  matchScore: number
}

function referenceHoverLabel(row: DealDeskDraftRow): string | null {
  if (!row.reference) return null
  return row.reference.companyName
    ? `${row.reference.title} · ${row.reference.companyName}`
    : row.reference.title
}

function statusDotTitle(
  row: DealDeskDraftRow,
  status: 'ready' | 'draft' | 'gap',
): string | undefined {
  if (status === 'gap') return COPY.deals.cockpit.draftsNoReference
  return referenceHoverLabel(row) ?? undefined
}

export function DealRfpDraftsSection({
  data,
  deal,
}: {
  data: DealRfpCockpitData
  deal: DealWithReferences
}) {
  const showSection = data.hasAnalysis && !data.isStale
  const [rows, setRows] = useState(data.draftRows)
  const [sectionExpanded, setSectionExpanded] = useState(false)
  const [showAllDrafts, setShowAllDrafts] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [saving, setSaving] = useState(false)
  const [kiOpen, setKiOpen] = useState(false)
  const [activeKi, setActiveKi] = useState<ActiveKi | null>(null)

  useEffect(() => {
    setRows(data.draftRows)
  }, [data.draftRows])

  const sortedRows = useMemo(() => sortDraftRowsByCriticality(rows), [rows])
  const visibleRows = useMemo(
    () => (showAllDrafts ? sortedRows : sortedRows.slice(0, VISIBLE_DRAFTS_DEFAULT)),
    [showAllDrafts, sortedRows],
  )

  if (!showSection) return null

  const dealContext = buildDealContextForAiDraft(deal)
  const covered = rows.filter((d) => Boolean(d.reference)).length
  const gaps = rows.length - covered

  function toggleExpand(id: string) {
    setExpandedId((prev) => {
      const next = prev === id ? null : id
      if (next !== editingId) {
        setEditingId(null)
        setDraftText('')
      }
      return next
    })
  }

  function startEdit(row: DealDeskDraftRow) {
    setExpandedId(row.id)
    setEditingId(row.id)
    setDraftText(row.answer ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftText('')
  }

  async function saveEdit(row: DealDeskDraftRow) {
    setSaving(true)
    try {
      const res = await updateDealRfpDraftAnswer({
        dealId: deal.id,
        draftId: row.id,
        answer: draftText,
      })
      if (!res.success) {
        toast.error(res.error ?? COPY.deals.cockpit.draftsSaveFailed)
        return
      }
      const nextAnswer = draftText.trim() || null
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, answer: nextAnswer } : r)),
      )
      setEditingId(null)
      toast.success(COPY.deals.cockpit.draftsSaveSuccess)
    } finally {
      setSaving(false)
    }
  }

  function openAiDraft(row: DealDeskDraftRow) {
    const ref = row.reference
    if (!ref?.id) return
    setActiveKi({
      row,
      referenceId: ref.id,
      referenceTitle: ref.title,
      matchScore: ref.matchPercent,
    })
    setKiOpen(true)
  }

  const coveredLabel = COPY.deals.cockpit.draftsCoveredCount
    .replace('{covered}', String(covered))
    .replace('{total}', String(rows.length))
  const gapsLabel =
    gaps > 0 ? COPY.deals.cockpit.draftsGapsCount.replace('{count}', String(gaps)) : null
  const sectionTitle =
    rows.length > 0
      ? `${COPY.deals.cockpit.draftsTitle} · ${rows.length}`
      : COPY.deals.cockpit.draftsTitle

  if (rows.length === 0) {
    return (
      <Card id="drafts" className="scroll-mt-24 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{sectionTitle}</CardTitle>
          <CardDescription>{COPY.deals.cockpit.draftsEmpty}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card id="drafts" className="scroll-mt-24 shadow-sm">
        <Collapsible
          open={sectionExpanded}
          onOpenChange={(open) => {
            setSectionExpanded(open)
            if (!open) {
              setShowAllDrafts(false)
              setExpandedId(null)
              setEditingId(null)
            }
          }}
        >
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex w-full items-start gap-2 text-left">
                <AppIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className={cn(
                    'mt-0.5 shrink-0 text-muted-foreground transition-transform',
                    sectionExpanded && 'rotate-90',
                  )}
                />
                <div className="min-w-0">
                  <CardTitle className="text-base">{sectionTitle}</CardTitle>
                  {sectionExpanded ? (
                    <CardDescription className="mt-1">
                      {coveredLabel}
                      {gapsLabel ? ` · ${gapsLabel}` : ''}
                    </CardDescription>
                  ) : null}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="relative p-0">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-500/[0.06] via-amber-500/[0.04] to-emerald-500/[0.06]"
                aria-hidden
              />
              <ul className="relative divide-y divide-border/60">
                {visibleRows.map((row) => {
                  const status = draftRowStatus(row)
                  const expanded = expandedId === row.id
                  const editing = editingId === row.id
                  const dotTitle = statusDotTitle(row, status)
                  const refLabel = referenceHoverLabel(row)

                  return (
                    <li
                      key={row.id}
                      className={cn('group/draft', expanded && 'bg-muted/20')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.id)}
                        aria-expanded={expanded}
                        aria-label={COPY.deals.cockpit.draftsOpenDetail}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <span
                          className={cn(
                            'size-2.5 shrink-0 rounded-full',
                            status === 'ready' && 'bg-emerald-500',
                            status === 'draft' && 'bg-amber-500',
                            status === 'gap' && 'bg-red-500',
                          )}
                          title={dotTitle}
                          aria-label={dotTitle}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                              {row.requirement}
                            </p>
                            {status === 'ready' || status === 'gap' ? (
                              <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {draftStatusLabel(status)}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                                {draftStatusLabel(status)}
                              </span>
                            )}
                          </div>
                        </div>
                        <AppIcon
                          icon={ArrowRight01Icon}
                          size={16}
                          className={cn(
                            'shrink-0 text-muted-foreground transition-transform',
                            expanded && 'rotate-90',
                          )}
                        />
                      </button>

                      {expanded ? (
                        <div className="space-y-3 border-t border-border/50 px-4 pb-4 pt-3 pl-9">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {COPY.deals.cockpit.draftsAnswerLabel}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {!editing ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className={cn(
                                    'h-8 px-2 opacity-0 transition-opacity',
                                    'group-hover/draft:opacity-100 group-focus-within/draft:opacity-100',
                                  )}
                                  onClick={() => startEdit(row)}
                                  aria-label={COPY.deals.cockpit.draftsEditAria}
                                >
                                  <AppIcon icon={PencilEdit01Icon} size={14} />
                                </Button>
                              ) : null}
                              {row.reference?.id ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => openAiDraft(row)}
                                >
                                  {COPY.deals.cockpit.draftsGenerateCta}
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {editing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                rows={5}
                                className="min-h-[120px] text-sm"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={saving}
                                  onClick={() => void saveEdit(row)}
                                >
                                  {COPY.deals.cockpit.draftsSave}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={cancelEdit}
                                >
                                  {COPY.deals.cockpit.draftsCancelEdit}
                                </Button>
                              </div>
                            </div>
                          ) : row.answer?.trim() ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                              {row.answer}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {COPY.deals.cockpit.draftsAnswerEmpty}
                            </p>
                          )}

                          {refLabel ? (
                            <p className="text-xs text-muted-foreground">
                              {refLabel}
                              {row.reference ? ` · ${row.reference.matchPercent}%` : ''}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {COPY.deals.cockpit.draftsNoReference}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              {sortedRows.length > VISIBLE_DRAFTS_DEFAULT ? (
                <div className="relative border-t border-border/60 px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAllDrafts((v) => !v)}
                  >
                    {showAllDrafts
                      ? COPY.deals.cockpit.draftsShowFewer
                      : COPY.deals.cockpit.draftsShowAll.replace(
                          '{count}',
                          String(sortedRows.length),
                        )}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {activeKi ? (
        <AiDraftSheet
          open={kiOpen}
          onOpenChange={setKiOpen}
          referenceId={activeKi.referenceId}
          referenceTitle={activeKi.referenceTitle}
          matchScore={activeKi.matchScore}
          dealId={deal.id}
          dealContext={`${dealContext}\n\nRFP-Anforderung:\n${activeKi.row.requirement}`}
        />
      ) : null}
    </>
  )
}
