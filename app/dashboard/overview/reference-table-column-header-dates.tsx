"use client"

import type * as React from "react"

import { DraggableColumnHead } from "@/components/table/draggable-column-head"

import type {
  ReferenceColumnKey,
  ReferenceTableHeaderRenderContext,
} from "./reference-table-column-types"
import {
  buildHeaderDragProps,
  ColumnSortButton,
} from "./reference-table-column-header-shared"

const DATE_COLUMNS = [
  "updated_at",
  "project_start",
  "project_end",
  "duration_months",
  "created_at",
] as const satisfies readonly ReferenceColumnKey[]

export type ReferenceDateColumnKey = (typeof DATE_COLUMNS)[number]

export function isDateColumn(
  column: ReferenceColumnKey
): column is ReferenceDateColumnKey {
  return (DATE_COLUMNS as readonly string[]).includes(column)
}

export function renderDateColumnHeader(
  column: ReferenceDateColumnKey,
  ctx: ReferenceTableHeaderRenderContext
): React.ReactNode {
  return (
    <DraggableColumnHead
      {...buildHeaderDragProps(column, ctx)}
      className="text-right"
      contentAlign="end"
    >
      <ColumnSortButton
        column={column}
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
        label={ctx.COLUMN_LABELS[column]}
        className="ml-auto flex items-center gap-0.5 hover:opacity-80"
      />
    </DraggableColumnHead>
  )
}
