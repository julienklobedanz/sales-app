import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_AREA_ICONS } from '@/lib/deals/deal-workspace-area-icons'
import type { DealWorkspaceTile } from '@/lib/deals/build-deal-workspace-tiles'
import { AppIcon } from '@/lib/icons'

export function DealWorkspaceTiles({ tiles }: { tiles: DealWorkspaceTile[] }) {
  if (tiles.length === 0) return null

  return (
    <section className="mb-6 space-y-4 border-t border-border/70 pt-8">
      <h2 className="text-base font-semibold">{COPY.deals.cockpit.rfpBlockTitle}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Card key={tile.area} className="p-0">
            <Link
              href={tile.href}
              className="block h-full rounded-lg focus-visible:outline-none"
            >
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <AppIcon
                  icon={DEAL_WORKSPACE_AREA_ICONS[tile.area]}
                  size={18}
                  className="text-muted-foreground"
                />
                <p className="text-sm font-semibold">{tile.label}</p>
                <p className="text-sm text-muted-foreground">{tile.purpose}</p>
                {tile.state ? (
                  <p className="mt-auto text-sm font-medium tabular-nums">{tile.state}</p>
                ) : null}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  )
}
