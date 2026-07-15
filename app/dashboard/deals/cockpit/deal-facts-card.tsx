'use client'

import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { buildDealFactRows } from '@/lib/deals/deal-facts-rows'
import type { OrgDateDisplayFormat } from '@/lib/format'

import type { DealWithReferences } from '../types'

export function DealFactsCard({
  deal,
  hubspotPortalId = null,
  orgDateDisplayFormat = 'de-DE',
}: {
  deal: DealWithReferences
  hubspotPortalId?: string | null
  orgDateDisplayFormat?: OrgDateDisplayFormat
}) {
  const rows = buildDealFactRows(deal, { hubspotPortalId, dateDisplayFormat: orgDateDisplayFormat })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{COPY.deals.cockpit.factsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-sm">
            <span className="shrink-0 text-muted-foreground">{row.label}</span>
            {row.kind === 'link' ? (
              <Link
                href={row.href}
                target="_blank"
                rel="noreferrer"
                className="max-w-[60%] truncate text-right font-medium text-primary hover:underline"
              >
                {row.linkLabel}
              </Link>
            ) : (
              <span className="max-w-[60%] truncate text-right font-medium">{row.value}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
