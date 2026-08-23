import type { ReactNode } from 'react'

import type { DealEntryPanelHost } from '@/lib/deals/deal-workspace-areas'

export function DealEntryPanel({
  host,
  children,
}: {
  host: DealEntryPanelHost
  children: ReactNode
}) {
  return (
    <section data-entry-panel-host={host} className="flex h-full min-h-0 flex-col">
      {children}
    </section>
  )
}
