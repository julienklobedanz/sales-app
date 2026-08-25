import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { formatNumberDe } from '@/lib/format'
import type { TenderLot } from '@/lib/deals/tender-lots'

function formatLotValue(lot: TenderLot): string | null {
  if (lot.estimatedValueEur != null && lot.estimatedValueEur > 0) {
    return `€ ${formatNumberDe(Math.round(lot.estimatedValueEur))}`
  }
  return lot.estimatedValueText?.trim() || null
}

export function DealRfpLotsSection({ lots }: { lots: TenderLot[] }) {
  const title =
    lots.length > 0
      ? `${COPY.deals.cockpit.ausschreibungNavLose} · ${lots.length}`
      : COPY.deals.cockpit.ausschreibungNavLose

  return (
    <Card className="scroll-mt-24 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {lots.length === 0 ? (
          <CardDescription>{COPY.deals.cockpit.lotsEmpty}</CardDescription>
        ) : null}
      </CardHeader>
      {lots.length > 0 ? (
        <CardContent className="space-y-4 pt-0">
          {lots.map((lot, index) => {
            const valueLabel = formatLotValue(lot)
            const key = lot.lotId ?? `${lot.title}-${index}`
            return (
              <Card key={key} className="space-y-1.5 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <CardTitle as="h3" className="text-sm">
                    {lot.lotId ? (
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        {lot.lotId}
                      </span>
                    ) : null}
                    {lot.title}
                  </CardTitle>
                  {valueLabel ? (
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {valueLabel}
                    </span>
                  ) : null}
                </div>
                {lot.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {lot.description}
                  </p>
                ) : null}
              </Card>
            )
          })}
        </CardContent>
      ) : null}
    </Card>
  )
}
