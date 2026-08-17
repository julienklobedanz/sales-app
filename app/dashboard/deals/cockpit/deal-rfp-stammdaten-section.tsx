import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

/** Document facts from the RFP snapshot. */
export function DealRfpStammdatenSection({ data }: { data: DealRfpCockpitData }) {
  const rows = data.stammdatenRows

  return (
    <Card id="stammdaten" className="scroll-mt-24 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {rows.length > 0
            ? `${COPY.deals.cockpit.stammdatenTitle} · ${rows.length}`
            : COPY.deals.cockpit.stammdatenTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {COPY.deals.cockpit.stammdatenEmpty}
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.key} className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm font-medium leading-snug">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
