'use client'

import { CirclePlus } from '@hugeicons/core-free-icons'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { BRAND_PRIMARY_BUTTON_CLASS } from '@/lib/shell-styles'
import { cn } from '@/lib/utils'

const PRIMARY_CTA_CLASS = cn(
  BRAND_PRIMARY_BUTTON_CLASS,
  'h-10 w-full min-w-0 justify-center gap-1.5 rounded-lg px-3',
)

export function CollectionPrimaryAction({
  label,
  onCreate,
  onImport,
  canImport = false,
  importing = false,
}: {
  label: string
  onCreate: () => void
  onImport?: () => void
  canImport?: boolean
  importing?: boolean
}) {
  if (canImport && onImport) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="toolbar" className={PRIMARY_CTA_CLASS}>
            <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
            <span className="max-w-[9rem] truncate sm:max-w-none">{label}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onCreate}>{COPY.dashboard.createManual}</DropdownMenuItem>
          <DropdownMenuItem disabled={importing} onSelect={onImport}>
            {COPY.dashboard.createImport}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button type="button" size="toolbar" className={PRIMARY_CTA_CLASS} onClick={onCreate}>
      <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
      <span className="max-w-[9rem] truncate sm:max-w-none">{label}</span>
    </Button>
  )
}
