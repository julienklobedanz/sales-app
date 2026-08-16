'use client'

import type * as React from 'react'

import { DraggableColumnHead } from '@/components/table/draggable-column-head'

import type {
  ReferenceColumnKey,
  ReferenceTableHeaderRenderContext,
} from './reference-table-column-types'
import {
  buildHeaderDragProps,
  ColumnSortButton,
} from './reference-table-column-header-shared'
import {
  isDateColumn,
  renderDateColumnHeader,
} from './reference-table-column-header-dates'

function renderSortOnlyHeader(
  column: ReferenceColumnKey,
  ctx: ReferenceTableHeaderRenderContext,
  options?: { activePrimary?: boolean; alignEnd?: boolean },
): React.ReactNode {
  return (
    <DraggableColumnHead
      {...buildHeaderDragProps(column, ctx)}
      className={options?.alignEnd ? 'text-right' : undefined}
      contentAlign={options?.alignEnd ? 'end' : undefined}
    >
      <ColumnSortButton
        column={column}
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
        label={ctx.COLUMN_LABELS[column]}
        activePrimary={options?.activePrimary}
        className={
          options?.alignEnd
            ? 'ml-auto flex items-center gap-0.5 hover:opacity-80'
            : undefined
        }
      />
    </DraggableColumnHead>
  )
}

export function renderReferenceColumnHeader(
  column: ReferenceColumnKey,
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  switch (column) {
    case 'company':
      return renderSortOnlyHeader(column, ctx, { activePrimary: true })
    case 'title':
      return renderSortOnlyHeader(column, ctx, { activePrimary: true })
    case 'summary':
      return renderSortOnlyHeader(column, ctx)
    case 'status':
      return renderSortOnlyHeader(column, ctx, { activePrimary: true })
    case 'project_year':
      return renderSortOnlyHeader(column, ctx, { alignEnd: true })
    case 'volume_eur':
      return renderSortOnlyHeader(column, ctx, { alignEnd: true })
    case 'industry':
    case 'project_status':
    case 'tags':
    case 'country':
      return renderSortOnlyHeader(column, ctx)
    default:
      if (isDateColumn(column)) {
        return renderDateColumnHeader(column, ctx)
      }
      return null
  }
}
