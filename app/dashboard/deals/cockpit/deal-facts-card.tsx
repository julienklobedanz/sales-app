'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { formatDealVolume } from '@/lib/format'

import type { DealWithReferences } from '../types'

export function DealFactsCard({ deal }: { deal: DealWithReferences }) {
  const owner = deal.sales_manager_name ?? deal.account_manager_name ?? '—'

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Account', value: deal.company_name ?? '—' },
    { label: 'Volumen', value: formatDealVolume(deal.volume) },
    { label: 'Branche', value: deal.industry ?? '—' },
    { label: COPY.roles.accountManager, value: deal.account_manager_name ?? '—' },
    { label: COPY.roles.salesManager, value: deal.sales_manager_name ?? '—' },
    { label: 'Owner', value: owner },
    { label: 'Close', value: deal.expiry_date ?? '—' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{COPY.deals.cockpit.factsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-right truncate max-w-[60%]">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
