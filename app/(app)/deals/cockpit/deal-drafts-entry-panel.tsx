'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AiDraftComposer } from '@/app/(app)/deals/components/ai-draft-composer'
import type { DealWithReferences } from '@/app/(app)/deals/types'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealDeskDraftRow } from '@/lib/deal-desk/deal-analysis-types'
import { buildDealContextForAiDraft } from '@/lib/deals/build-deal-context-for-ai-draft'
import { draftRowStatus } from '@/lib/deals/sort-draft-rows-by-criticality'

import { DealEntryPanel } from './deal-entry-panel'
import { updateDealRfpDraftAnswer } from './deal-rfp-draft-actions'
import { draftStatusLabel } from './deal-rfp-drafts-section'

export function DealDraftsEntryPanel({
  rows,
  deal,
}: {
  rows: DealDeskDraftRow[]
  deal: DealWithReferences
}) {
  const { selected } = useCollectionObjectSelection({
    items: rows,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  return (
    <DealEntryPanel host="workspace">
      {!selected ? (
        <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.entryPanelEmpty}</p>
      ) : (
        <DraftEntryBody key={selected.id} row={selected} deal={deal} />
      )}
    </DealEntryPanel>
  )
}

function DraftEntryBody({
  row,
  deal,
}: {
  row: DealDeskDraftRow
  deal: DealWithReferences
}) {
  const router = useRouter()
  const [draftText, setDraftText] = useState(row.answer ?? '')
  const [saving, setSaving] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  async function saveAnswer(next: string) {
    setSaving(true)
    try {
      const res = await updateDealRfpDraftAnswer({
        dealId: deal.id,
        draftId: row.id,
        answer: next,
      })
      if (!res.success) {
        toast.error(res.error ?? COPY.deals.cockpit.draftsSaveFailed)
        return
      }
      toast.success(COPY.deals.cockpit.draftsSaveSuccess)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (composerOpen && row.reference?.id) {
    return (
      <ComposerView
        row={row}
        deal={deal}
        onBack={() => setComposerOpen(false)}
        onApply={async (text) => {
          setDraftText(text)
          setComposerOpen(false)
          await saveAnswer(text)
        }}
      />
    )
  }

  return (
    <DraftBody
      row={row}
      draftText={draftText}
      saving={saving}
      onDraftTextChange={setDraftText}
      onSave={() => void saveAnswer(draftText)}
      onOpenComposer={() => setComposerOpen(true)}
    />
  )
}

function DraftBody({
  row,
  draftText,
  saving,
  onDraftTextChange,
  onSave,
  onOpenComposer,
}: {
  row: DealDeskDraftRow
  draftText: string
  saving: boolean
  onDraftTextChange: (value: string) => void
  onSave: () => void
  onOpenComposer: () => void
}) {
  const status = draftRowStatus(row)
  const refLabel = row.reference
    ? row.reference.companyName
      ? `${row.reference.title} · ${row.reference.companyName}`
      : row.reference.title
    : null

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {COPY.deals.cockpit.draftsDetailTitle}
        </p>
        <h2 className="text-base font-semibold">{row.requirement}</h2>
        <p className="text-xs text-muted-foreground">{draftStatusLabel(status)}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {COPY.deals.cockpit.draftsAnswerLabel}
        </p>
        <Textarea
          value={draftText}
          onChange={(e) => onDraftTextChange(e.target.value)}
          rows={8}
          className="min-h-[160px] flex-1 text-sm"
          placeholder={COPY.deals.cockpit.draftsAnswerEmpty}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={onSave}>
          {COPY.deals.cockpit.draftsSave}
        </Button>
        {row.reference?.id ? (
          <Button type="button" size="sm" variant="outline" onClick={onOpenComposer}>
            {COPY.deals.cockpit.draftsKiDraftCta}
          </Button>
        ) : null}
      </div>

      {refLabel ? (
        <p className="text-xs text-muted-foreground">
          {refLabel}
          {row.reference ? ` · ${row.reference.matchPercent}%` : ''}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{COPY.deals.cockpit.draftsNoReference}</p>
      )}
    </div>
  )
}

function ComposerView({
  row,
  deal,
  onBack,
  onApply,
}: {
  row: DealDeskDraftRow
  deal: DealWithReferences
  onBack: () => void
  onApply: (text: string) => void | Promise<void>
}) {
  const ref = row.reference
  if (!ref?.id) return null
  const dealContext = buildDealContextForAiDraft(deal)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          onClick={onBack}
        >
          <AppIcon icon={ArrowLeftIcon} size={16} />
          {COPY.deals.cockpit.draftsBackToEntry}
        </Button>
      </div>
      <AiDraftComposer
        referenceId={ref.id}
        referenceTitle={ref.title}
        matchScore={ref.matchPercent / 100}
        dealId={deal.id}
        dealContext={`${dealContext}\n\nRFP-Anforderung:\n${row.requirement}`}
        onApplyToAnswer={(text) => void onApply(text)}
        className="min-h-0 flex-1"
      />
    </div>
  )
}
