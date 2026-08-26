'use client'

import Link from 'next/link'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'
import { DEAL_WORKSPACE_AREA_ICONS } from '@/lib/deals/deal-workspace-area-icons'
import type { AusschreibungNavItem } from '@/lib/deals/build-ausschreibung-nav-items'
import { cn } from '@/lib/utils'

export function DealWorkspaceRail({
  items,
  currentArea,
}: {
  items: AusschreibungNavItem[]
  currentArea: DealWorkspaceArea
}) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label={COPY.deals.cockpit.rfpBlockTitle}
      className="sticky top-0 flex h-full w-[4.25rem] shrink-0 flex-col border-r border-border bg-card py-3 md:w-52"
    >
      <ul className="flex flex-col gap-0.5 px-1.5 md:px-2">
        {items.map((item) => {
          const current = item.id === currentArea
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-sm font-medium transition-colors md:flex-row md:items-center md:gap-2 md:px-2',
                  current
                    ? 'bg-muted text-foreground'
                    : 'text-foreground hover:bg-muted/70',
                )}
              >
                <AppIcon
                  icon={DEAL_WORKSPACE_AREA_ICONS[item.id]}
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="hidden min-w-0 truncate md:inline">{item.label}</span>
                {item.count ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground md:ml-auto md:text-sm">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
