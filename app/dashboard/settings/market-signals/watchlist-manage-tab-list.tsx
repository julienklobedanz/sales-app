'use client'

import { Building2, Users } from '@hugeicons/core-free-icons'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AppIcon } from '@/lib/icons'
import { BRAND_PRIMARY_PILL_ACTIVE_CLASS } from '@/lib/cognism-shell-styles'
import { cn } from '@/lib/utils'

import type { ManageWatchlistTab } from './watchlist-manage-types'

const MANAGE_TAB_BUTTON_CLASS =
  'inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground shadow-none transition-colors hover:bg-muted/50 hover:text-foreground'

export function WatchlistManageTabList({
  activeTab,
  onTabChange,
}: {
  activeTab: ManageWatchlistTab
  onTabChange: (value: ManageWatchlistTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Bereich"
      className="flex w-full items-center justify-center gap-1.5"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'companies'}
            aria-label="Accounts"
            onClick={() => onTabChange('companies')}
            className={cn(
              MANAGE_TAB_BUTTON_CLASS,
              activeTab === 'companies'
                ? cn(BRAND_PRIMARY_PILL_ACTIVE_CLASS, 'shadow-sm')
                : null,
            )}
          >
            <AppIcon
              icon={Building2}
              size={20}
              color={activeTab === 'companies' ? '#ffffff' : 'currentColor'}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Accounts</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'executives'}
            aria-label="Executives"
            onClick={() => onTabChange('executives')}
            className={cn(
              MANAGE_TAB_BUTTON_CLASS,
              activeTab === 'executives'
                ? cn(BRAND_PRIMARY_PILL_ACTIVE_CLASS, 'shadow-sm')
                : null,
            )}
          >
            <AppIcon
              icon={Users}
              size={20}
              color={activeTab === 'executives' ? '#ffffff' : 'currentColor'}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Executives</TooltipContent>
      </Tooltip>
    </div>
  )
}
