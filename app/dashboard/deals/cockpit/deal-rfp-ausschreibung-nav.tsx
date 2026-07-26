'use client'

import {
  Alert01Icon,
  BalanceScaleIcon,
  Certificate01Icon,
  Database01Icon,
  File02Icon,
  NoteEditIcon,
} from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { AusschreibungNavItem } from '@/lib/deals/build-ausschreibung-nav-items'
import { cn } from '@/lib/utils'

const NAV_ICONS: Record<string, typeof File02Icon> = {
  dokumente: File02Icon,
  urteil: BalanceScaleIcon,
  stammdaten: Database01Icon,
  eligCard: Certificate01Icon,
  risks: Alert01Icon,
  drafts: NoteEditIcon,
}

export function DealRfpAusschreibungNav({ items }: { items: AusschreibungNavItem[] }) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label={COPY.deals.cockpit.rfpBlockTitle}
      className="sticky top-0 z-20 -mx-1 mb-2 border-b border-border/70 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="flex gap-1 overflow-x-auto pb-0.5">
        {items.map((item) => {
          const icon = NAV_ICONS[item.id]
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors',
                  'hover:bg-muted hover:text-foreground'
                )}
              >
                {icon ? (
                  <AppIcon icon={icon} size={14} className="shrink-0 opacity-80" />
                ) : null}
                {item.label}
                {item.count ? (
                  <span className="tabular-nums text-muted-foreground/80">{item.count}</span>
                ) : null}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
