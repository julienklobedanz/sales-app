'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { clampColumnWidth, saveColumnWidthsToStorage } from '@/lib/table-column-sizing'

import {
  COLUMN_KEYS,
  COLUMN_ORDER_STORAGE_KEY,
  COLUMN_SIZING_STORAGE_KEY,
  COLUMN_VISIBLE_STORAGE_KEY,
  DEFAULT_VISIBLE,
  loadColumnOrderFromStorage,
  loadReferenceColumnWidthsFromStorage,
  loadVisibleColumnsFromStorage,
} from './reference-overview-columns'
import type { ReferenceColumnKey } from './reference-table-column-types'

export function useReferenceOverviewColumns() {
  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof COLUMN_KEYS)[number], boolean>
  >(loadVisibleColumnsFromStorage)
  const [columnOrder, setColumnOrder] = useState<ReferenceColumnKey[]>(() =>
    loadColumnOrderFromStorage(),
  )
  const [columnWidths, setColumnWidths] = useState<Record<ReferenceColumnKey, number>>(
    () => loadReferenceColumnWidthsFromStorage(),
  )
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder))
    } catch {
      /* ignore */
    }
  }, [columnOrder])

  useEffect(() => {
    saveColumnWidthsToStorage(COLUMN_SIZING_STORAGE_KEY, columnWidths)
  }, [columnWidths])

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_VISIBLE_STORAGE_KEY, JSON.stringify(visibleColumns))
    } catch {
      /* ignore */
    }
  }, [visibleColumns])

  const handleColumnWidthChange = useCallback(
    (column: ReferenceColumnKey, width: number) => {
      setColumnWidths((prev) => ({
        ...prev,
        [column]: clampColumnWidth(width),
      }))
    },
    [],
  )

  const resetVisibleColumns = useCallback(() => {
    setVisibleColumns({ ...DEFAULT_VISIBLE })
  }, [])

  const orderedVisibleColumnKeys = useMemo(
    () => columnOrder.filter((k) => visibleColumns[k]),
    [columnOrder, visibleColumns],
  )

  const moveColumnOrder = useCallback((from: string, to: string) => {
    if (from === to) return
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== from)
      const insertAt = next.indexOf(to as ReferenceColumnKey)
      if (insertAt === -1) return prev
      next.splice(insertAt, 0, from as ReferenceColumnKey)
      return next
    })
  }, [])

  return {
    visibleColumns,
    setVisibleColumns,
    columnOrder,
    columnWidths,
    dragOverColumn,
    setDragOverColumn,
    handleColumnWidthChange,
    resetVisibleColumns,
    orderedVisibleColumnKeys,
    moveColumnOrder,
  }
}
