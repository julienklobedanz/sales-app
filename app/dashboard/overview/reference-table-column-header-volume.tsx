'use client'

import type * as React from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DraggableColumnHead } from '@/components/table/draggable-column-head'
import { Filter } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { ReferenceVolumeFilterMenu } from '@/components/references/reference-volume-filter-menu'

import type { ReferenceTableHeaderRenderContext } from './reference-table-column-types'
import {
  buildHeaderDragProps,
  ColumnSortButton,
} from './reference-table-column-header-shared'

export function renderVolumeHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  const { volumeFilter, setVolumeFilter, COLUMN_LABELS, sortKey, sortDir, handleSort } =
    ctx

  return (
    <DraggableColumnHead
      {...buildHeaderDragProps('volume_eur', ctx)}
      className="text-right"
      contentAlign="end"
    >
      <div className="ml-auto flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1 hover:opacity-80 ${volumeFilter !== 'all' ? 'font-semibold text-foreground' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{COLUMN_LABELS.volume_eur}</span>
              {volumeFilter !== 'all' && (
                <AppIcon
                  icon={Filter}
                  size={14}
                  className="shrink-0 text-primary"
                  aria-hidden
                />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-1"
            align="end"
            onClick={(e) => e.stopPropagation()}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <ReferenceVolumeFilterMenu value={volumeFilter} onChange={setVolumeFilter} />
          </PopoverContent>
        </Popover>
        <ColumnSortButton
          column="volume_eur"
          sortKey={sortKey}
          sortDir={sortDir}
          handleSort={handleSort}
          activePrimary
        />
      </div>
    </DraggableColumnHead>
  )
}
