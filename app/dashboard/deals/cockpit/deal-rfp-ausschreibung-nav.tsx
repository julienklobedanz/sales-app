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

/** Visual language aligned with References `TableBulkActionsBar` (pill actions, soft card). */
export function DealRfpAusschreibungNav({ items }: { items: AusschreibungNavItem[] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label={COPY.deals.cockpit.rfpBlockTitle} className="sticky top-0 z-20 mb-3">
      <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-lg dark:border-border dark:bg-card sm:p-3">
        <ul className="flex gap-1 overflow-x-auto pb-0.5">
          {items.map((item) => {
            const icon = NAV_ICONS[item.id]
            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors',
                    'hover:bg-gray-50 dark:text-foreground dark:hover:bg-muted',
                  )}
                >
                  {icon ? (
                    <AppIcon
                      icon={icon}
                      size={16}
                      className="shrink-0 text-gray-500 dark:text-muted-foreground"
                    />
                  ) : null}
                  <span>{item.label}</span>
                  {item.count ? (
                    <span className="tabular-nums text-gray-500 dark:text-muted-foreground">
                      {item.count}
                    </span>
                  ) : null}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
