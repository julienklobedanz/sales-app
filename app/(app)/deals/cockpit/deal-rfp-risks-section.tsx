'use client'

import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealWorkspaceRiskEntry } from '@/lib/deals/deal-workspace-risk-entry'
import { cn } from '@/lib/utils'
import { statusTone } from '@/lib/ui/status-tone'

export function riskFlagSeverityBadge(severity: 'critical' | 'high' | 'medium'): {
  label: string
  className: string
} {
  switch (severity) {
    case 'critical':
      return {
        label: COPY.deals.cockpit.risksSeverityCritical,
        className: statusTone.danger,
      }
    case 'high':
      return {
        label: COPY.deals.cockpit.risksSeverityHigh,
        className: statusTone.warning,
      }
    default:
      return {
        label: COPY.deals.cockpit.risksSeverityMedium,
        className: statusTone.neutral,
      }
  }
}

export function DealRfpRisksSection({
  entries,
  visible,
}: {
  entries: DealWorkspaceRiskEntry[]
  visible: boolean
}) {
  const { hrefFor, selected } = useCollectionObjectSelection({
    items: entries,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  if (!visible) return null

  const flags = entries.filter((e) => e.kind === 'red-flag')

  return (
    <div id="risks" className="scroll-mt-24">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {`${COPY.deals.cockpit.risksTitle} · ${flags.length}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Card className="p-3">
            <CardTitle as="h3" className="mb-2 text-sm font-medium">
              {COPY.deals.cockpit.risksGeneralTitle}
              {flags.length > 0 ? ` · ${flags.length}` : ''}
            </CardTitle>
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.risksGeneralEmpty}
              </p>
            ) : (
              <ul className="space-y-0 divide-y divide-border/60">
                {flags.map((flag) => {
                  const badge = riskFlagSeverityBadge(flag.severity)
                  const current = selected?.id === flag.id
                  return (
                    <li key={flag.id}>
                      <Link
                        href={hrefFor(flag.id)}
                        aria-current={current ? 'page' : undefined}
                        aria-label={COPY.deals.cockpit.risksOpenEntry}
                        className={cn(
                          'flex items-start gap-3 py-3 first:pt-0 last:pb-0',
                          current && 'bg-muted/20',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{flag.title}</p>
                          {flag.excerpt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {flag.excerpt}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
