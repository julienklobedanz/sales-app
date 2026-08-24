'use client'

import { CirclePlus } from '@hugeicons/core-free-icons'
import { ChevronDown } from 'lucide-react'

import { CollectionToolbar } from '@/components/dashboard/collection-toolbar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
import { collectionToolbarSlotFill } from '@/lib/dashboard/collection-toolbar-slots'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { BRAND_PRIMARY_BUTTON_CLASS } from '@/lib/shell-styles'
import { cn } from '@/lib/utils'

export function ComplianceCollectionToolbar({
  search,
  onSearchChange,
  canManage,
  onUpload,
  onUploadBulk,
}: {
  search: string
  onSearchChange: (value: string) => void
  canManage: boolean
  onUpload: () => void
  onUploadBulk: () => void
}) {
  const slotFill = collectionToolbarSlotFill({
    collection: 'compliance',
    canCreateReference: false,
    canManageCompliance: canManage,
  })

  return (
    <CollectionToolbar
      slots={{
        'collection-search': (
          <ToolbarSearchField
            variant="dashboard"
            type="search"
            placeholder={COPY.compliance.searchPlaceholder}
            value={search}
            onChange={onSearchChange}
            wrapperClassName="min-w-0 w-full"
            className="bg-card"
            aria-label={COPY.compliance.searchPlaceholder}
          />
        ),
        'collection-filter-primary': null,
        'collection-filter-more': null,
        'collection-view': null,
        'collection-primary':
          slotFill['collection-primary'] === 'empty' ? null : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="toolbar"
                  className={cn(
                    BRAND_PRIMARY_BUTTON_CLASS,
                    'h-10 w-full min-w-0 justify-center gap-1.5 rounded-lg px-3',
                  )}
                >
                  <AppIcon icon={CirclePlus} size={16} className="shrink-0" />
                  <span className="max-w-[9rem] truncate sm:max-w-none">
                    {COPY.compliance.upload}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onUpload}>
                  {COPY.compliance.upload}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onUploadBulk}>
                  {COPY.compliance.uploadBulk}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        'collection-columns': null,
      }}
    />
  )
}
