'use client'

import Link from 'next/link'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealRfpRequirementRow } from '@/lib/deals/load-deal-rfp-requirements'
import type { RequestedEvidenceGapItem } from '@/lib/deals/build-requested-evidence-gaps'
import type { SmeTopicGroup } from '@/lib/deals/group-sme-by-topic'
import { requirementIdForSmeTask } from '@/lib/deals/requirement-id-for-sme-task'
import { cn } from '@/lib/utils'
import { statusTone } from '@/lib/ui/status-tone'

function evidenceGapBadgeClass(severity: 'missing' | 'partial' | 'info'): string {
  if (severity === 'missing') return statusTone.danger
  if (severity === 'partial') return statusTone.warning
  return statusTone.neutral
}

function evidenceGapBadgeLabel(severity: 'missing' | 'partial' | 'info'): string {
  if (severity === 'missing') return 'Fehlt'
  if (severity === 'partial') return 'Teilweise'
  return 'Prüfen'
}

function smeTopicBadgeClass(topic: string): string {
  const t = topic.toLowerCase()
  if (/legal|recht|vertrag/.test(t)) {
    return 'bg-primary/10 text-primary'
  }
  if (/security|sicherheit|compliance|iso/.test(t)) {
    return 'bg-sky-100 text-sky-800'
  }
  if (/pricing|finance|preis|kosten/.test(t)) {
    return 'bg-amber-100 text-amber-900'
  }
  return 'bg-blue-100 text-blue-800'
}

export function DealRfpRequirementsSection({
  requirements,
  requestedEvidenceGaps,
  smeGroups,
  showDerivedViews,
}: {
  requirements: DealRfpRequirementRow[]
  requestedEvidenceGaps: RequestedEvidenceGapItem[]
  smeGroups: SmeTopicGroup[]
  showDerivedViews: boolean
}) {
  const { hrefFor, selected } = useCollectionObjectSelection({
    items: requirements,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })
  const requirementIds = new Set(requirements.map((row) => row.id))
  const smeItems = smeGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, topic: group.topic })),
  )
  const sectionTitle =
    requirements.length > 0
      ? `${COPY.deals.cockpit.requirementsTitle} · ${requirements.length}`
      : COPY.deals.cockpit.requirementsTitle

  return (
    <div className="space-y-4">
      <Card id="anforderungen" className="scroll-mt-24 shadow-sm">
        <CardHeader className={requirements.length > 0 ? 'pb-3' : undefined}>
          <CardTitle className="text-base">{sectionTitle}</CardTitle>
          {requirements.length === 0 ? (
            <CardDescription>{COPY.deals.cockpit.requirementsEmpty}</CardDescription>
          ) : null}
        </CardHeader>
        {requirements.length > 0 ? (
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {requirements.map((row) => {
                const current = selected?.id === row.id
                const source =
                  row.sourceFileName ?? COPY.deals.cockpit.requirementsSourceUnknown
                return (
                  <li key={row.id} className={cn(current && 'bg-muted/20')}>
                    <Link
                      href={hrefFor(row.id)}
                      aria-current={current ? 'page' : undefined}
                      aria-label={COPY.deals.cockpit.requirementsOpenEntry}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {row.text}
                          </p>
                          {row.category ? (
                            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                              {row.category}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {COPY.deals.cockpit.requirementsSource}: {source}
                        </p>
                      </div>
                      <AppIcon
                        icon={ArrowRight01Icon}
                        size={16}
                        className="shrink-0 text-muted-foreground"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      {showDerivedViews ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="p-3 shadow-sm">
            <CardTitle as="h3" className="mb-2 text-sm font-medium">
              {COPY.deals.cockpit.risksRequestedEvidenceTitle}
              {requestedEvidenceGaps.length > 0
                ? ` · ${requestedEvidenceGaps.length}`
                : ''}
            </CardTitle>
            {requestedEvidenceGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.risksRequestedEvidenceEmpty}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {requestedEvidenceGaps.map((gap) => (
                  <li
                    key={gap.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
                        evidenceGapBadgeClass(gap.severity),
                      )}
                    >
                      {evidenceGapBadgeLabel(gap.severity)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{gap.label}</p>
                      {gap.detail ? (
                        <p className="mt-1 text-xs text-muted-foreground">{gap.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-3 shadow-sm">
            <CardTitle as="h3" className="mb-2 text-sm font-medium">
              {COPY.deals.cockpit.risksOpenPointsTitle}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {smeItems.length}
              </span>
            </CardTitle>
            {smeItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.risksOpenPointsEmpty}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {smeItems.map((item) => {
                  const linkedId = requirementIdForSmeTask(item.id, requirementIds)
                  const href = linkedId ? hrefFor(linkedId) : null
                  const current = linkedId != null && selected?.id === linkedId
                  const body = (
                    <>
                      <span
                        className={cn(
                          'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          smeTopicBadgeClass(item.topic),
                        )}
                      >
                        {item.topic}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {item.question}
                        </p>
                        {item.contextExcerpt && item.contextExcerpt !== item.question ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.contextExcerpt}
                          </p>
                        ) : null}
                      </div>
                    </>
                  )
                  return (
                    <li key={item.id}>
                      {href ? (
                        <Link
                          href={href}
                          aria-current={current ? 'page' : undefined}
                          aria-label={COPY.deals.cockpit.requirementsOpenEntry}
                          className={cn(
                            'flex items-start gap-3 py-3 first:pt-0 last:pb-0',
                            current && 'bg-muted/20',
                          )}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                          {body}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  )
}
