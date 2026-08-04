'use client'

import type * as React from 'react'

import { DraggableColumnHead } from '@/components/table/draggable-column-head'

import type { ReferenceTableHeaderRenderContext } from './reference-table-column-types'
import {
  buildHeaderDragProps,
  CheckboxFilterHeader,
} from './reference-table-column-header-shared'

export function renderStatusHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('status', ctx)}>
      <CheckboxFilterHeader
        label={ctx.COLUMN_LABELS.status}
        filterValue={ctx.statusFilter}
        setFilter={ctx.setStatusFilter}
        options={ctx.filterOptions.statuses}
        getLabel={(value) => ctx.STATUS_LABELS[value] ?? value}
        popoverClassName="w-56 p-1"
        listClassName="max-h-56 space-y-0 overflow-y-auto text-sm"
        sortColumn="status"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
        sortActivePrimary
      />
    </DraggableColumnHead>
  )
}

export function renderProjectStatusHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('project_status', ctx)}>
      <CheckboxFilterHeader
        label={ctx.COLUMN_LABELS.project_status}
        filterValue={ctx.projectStatusFilter}
        setFilter={ctx.setProjectStatusFilter}
        options={ctx.filterOptions.projectStatuses}
        getLabel={(value) => (value === 'active' ? 'Aktiv' : 'Abgeschlossen')}
        popoverClassName="w-64"
        listClassName="mt-2 max-h-56 space-y-0.5 overflow-y-auto p-0.5 text-sm"
        search={ctx.projectStatusSearch}
        setSearch={ctx.setProjectStatusSearch}
        searchPlaceholder="Projektstatus suchen…"
        sortColumn="project_status"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
      />
    </DraggableColumnHead>
  )
}
