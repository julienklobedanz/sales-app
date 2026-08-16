'use client'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'

export function CollectionColumnsMenu({
  columns,
  onToggle,
  onReset,
}: {
  columns: { id: string; label: string; visible: boolean }[]
  onToggle: (id: string, visible: boolean) => void
  onReset: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="toolbar" className="w-full bg-white">
          {COPY.dashboard.columnsButton}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)]">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.visible}
            onCheckedChange={(checked) => onToggle(column.id, Boolean(checked))}
            onSelect={(e: Event) => e.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-xs text-muted-foreground"
          onSelect={(e) => {
            e.preventDefault()
            onReset()
          }}
        >
          {COPY.dashboard.columnsReset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
