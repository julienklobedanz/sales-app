'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/lib/icons'
import { Cancel01Icon, FileDownIcon, LinkIcon, Trash2 } from '@hugeicons/core-free-icons'

type Props = {
  selectedCount: number
  selectedRefLabel: string
  showSalesActions: boolean
  showAdminDelete: boolean
  onClearSelection: () => void
  onBulkDelete: () => void
  onCreateSharedPortfolio: () => void
  onDownloadPdfs: () => void
}

export function ReferencesBulkActionsBar({
  selectedCount,
  selectedRefLabel,
  showSalesActions,
  showAdminDelete,
  onClearSelection,
  onBulkDelete,
  onCreateSharedPortfolio,
  onDownloadPdfs,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <p className="text-sm font-medium text-foreground">{selectedCount} ausgewählt</p>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 bg-background">
              Bulk-Aktionen
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px]">
            <DropdownMenuLabel>Bulk-Aktionen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {showSalesActions ? (
              <>
                <DropdownMenuItem onSelect={() => void onCreateSharedPortfolio()}>
                  <AppIcon icon={LinkIcon} size={16} className="mr-2" />
                  Kollektions-Link erstellen
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDownloadPdfs()}>
                  <AppIcon icon={FileDownIcon} size={16} className="mr-2" />
                  {selectedRefLabel} als PDF herunterladen
                </DropdownMenuItem>
              </>
            ) : null}
            {showAdminDelete ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e: Event) => {
                  e.preventDefault()
                  onBulkDelete()
                }}
              >
                <AppIcon icon={Trash2} size={16} className="mr-2" />
                Ausgewählte löschen
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onClearSelection()}>
              <AppIcon icon={Cancel01Icon} size={16} className="mr-2 text-muted-foreground" />
              Auswahl aufheben
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClearSelection}>
          Auswahl aufheben
        </Button>
      </div>
    </div>
  )
}
