import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumberDe } from '@/lib/format'
import type { TenderLot } from '@/lib/deals/tender-lots'

function formatLotValue(lot: TenderLot): string | null {
  if (lot.estimatedValueEur != null && lot.estimatedValueEur > 0) {
    return `€ ${formatNumberDe(Math.round(lot.estimatedValueEur))}`
  }
  return lot.estimatedValueText?.trim() || null
}

export function DealRfpLotsSection({ lots }: { lots: TenderLot[] }) {
  if (!lots.length) return null

  return (
    <Card id="lose">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lose</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lots.map((lot, index) => {
          const valueLabel = formatLotValue(lot)
          const key = lot.lotId ?? `${lot.title}-${index}`
          return (
            <div
              key={key}
              className="space-y-1.5 rounded-lg border border-border/80 bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {lot.lotId ? (
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {lot.lotId}
                    </span>
                  ) : null}
                  {lot.title}
                </h3>
                {valueLabel ? (
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {valueLabel}
                  </span>
                ) : null}
              </div>
              {lot.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{lot.description}</p>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
