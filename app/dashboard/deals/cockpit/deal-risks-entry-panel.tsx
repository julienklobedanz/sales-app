'use client'

import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealWorkspaceRiskEntry } from '@/lib/deals/deal-workspace-risk-entry'
import { cn } from '@/lib/utils'

import { DealEntryPanel } from './deal-entry-panel'
import {
  evidenceGapBadgeClass,
  evidenceGapBadgeLabel,
  riskFlagSeverityBadge,
  smeTopicBadgeClass,
} from './deal-rfp-risks-section'

export function DealRisksEntryPanel({
  entries,
}: {
  entries: DealWorkspaceRiskEntry[]
}) {
  const { selected } = useCollectionObjectSelection({
    items: entries,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  return (
    <DealEntryPanel host="workspace">
      {!selected ? (
        <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.entryPanelEmpty}</p>
      ) : selected.kind === 'red-flag' ? (
        <RiskFlagBody entry={selected} />
      ) : selected.kind === 'evidence' ? (
        <EvidenceBody entry={selected} />
      ) : (
        <SmeBody entry={selected} />
      )}
    </DealEntryPanel>
  )
}

function RiskFlagBody({
  entry,
}: {
  entry: Extract<DealWorkspaceRiskEntry, { kind: 'red-flag' }>
}) {
  const badge = riskFlagSeverityBadge(entry.severity)
  return (
    <div className="space-y-3">
      <span
        className={cn(
          'inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
          badge.className,
        )}
      >
        {badge.label}
      </span>
      <h2 className="text-base font-semibold">{entry.title}</h2>
      {entry.excerpt ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{entry.excerpt}</p>
      ) : null}
    </div>
  )
}

function EvidenceBody({
  entry,
}: {
  entry: Extract<DealWorkspaceRiskEntry, { kind: 'evidence' }>
}) {
  return (
    <div className="space-y-3">
      <span
        className={cn(
          'inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
          evidenceGapBadgeClass(entry.severity),
        )}
      >
        {evidenceGapBadgeLabel(entry.severity)}
      </span>
      <h2 className="text-base font-semibold">{entry.title}</h2>
      {entry.detail ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{entry.detail}</p>
      ) : null}
    </div>
  )
}

function SmeBody({
  entry,
}: {
  entry: Extract<DealWorkspaceRiskEntry, { kind: 'sme' }>
}) {
  return (
    <div className="space-y-3">
      <span
        className={cn(
          'inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          smeTopicBadgeClass(entry.topic),
        )}
      >
        {entry.topic}
      </span>
      <h2 className="text-base font-semibold">{entry.title}</h2>
      {entry.contextExcerpt && entry.contextExcerpt !== entry.title ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {entry.contextExcerpt}
        </p>
      ) : null}
    </div>
  )
}
