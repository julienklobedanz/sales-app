'use client'

import { Search01Icon } from '@hugeicons/core-free-icons'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function SidebarCommandSearch() {
  const { setOpen } = useCommandPalette()

  return (
    <SidebarMenu className="gap-0.5">
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip="Suchen"
          onClick={() => setOpen(true)}
          className={cn(
            'h-9 rounded-lg border border-border/40 bg-muted/45 text-muted-foreground shadow-none',
            'hover:bg-muted/75 hover:text-foreground',
            'active:bg-muted/75 active:text-foreground',
            'data-[active=true]:bg-muted/45 data-[active=true]:font-normal data-[active=true]:text-muted-foreground',
            'group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:border group-data-[collapsible=icon]:bg-muted/45'
          )}
          aria-label="Globale Suche öffnen"
        >
          <AppIcon icon={Search01Icon} size={16} className="shrink-0 opacity-70" />
          <span className="font-normal">Suchen</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
