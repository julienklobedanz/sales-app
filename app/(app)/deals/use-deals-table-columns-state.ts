'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'

import {
  loadColumnWidthsFromStorage,
  saveColumnWidthsToStorage,
} from '@/lib/table-column-sizing'

import {
  DEAL_COLUMN_SIZING_STORAGE_KEY,
  DEAL_COLUMNS_STORAGE_KEY,
  DEAL_DEFAULT_COLUMN_ORDER,
  DEAL_RESIZABLE_COLUMN_IDS,
} from './deals-table-constants'

const ALLOWED_DEAL_COLUMN_IDS = new Set<string>(DEAL_DEFAULT_COLUMN_ORDER)

export function normalizeDealColumnOrder(parsed: unknown): string[] {
  const allowed = ALLOWED_DEAL_COLUMN_IDS
  const seen = new Set<string>()
  const result: string[] = []
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item === 'string' && allowed.has(item) && !seen.has(item)) {
        seen.add(item)
        result.push(item)
      }
    }
  }
  for (const id of DEAL_DEFAULT_COLUMN_ORDER) {
    if (!seen.has(id)) result.push(id)
  }
  return result
}

function loadDealColumnOrderFromStorage(): string[] {
  if (typeof window === 'undefined') return [...DEAL_DEFAULT_COLUMN_ORDER]
  try {
    const raw = window.localStorage.getItem(DEAL_COLUMNS_STORAGE_KEY)
    if (!raw) return [...DEAL_DEFAULT_COLUMN_ORDER]
    return normalizeDealColumnOrder(JSON.parse(raw))
  } catch {
    return [...DEAL_DEFAULT_COLUMN_ORDER]
  }
}

export function useDealsTableColumnsState() {
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    loadDealColumnOrderFromStorage(),
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadColumnWidthsFromStorage(
      DEAL_COLUMN_SIZING_STORAGE_KEY,
      DEAL_RESIZABLE_COLUMN_IDS,
    ),
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DEAL_COLUMNS_STORAGE_KEY, JSON.stringify(columnOrder))
  }, [columnOrder])

  useEffect(() => {
    if (Object.keys(columnSizing).length === 0) return
    saveColumnWidthsToStorage(DEAL_COLUMN_SIZING_STORAGE_KEY, columnSizing)
  }, [columnSizing])

  const resetColumnsToDefault = useCallback(() => {
    setColumnOrder([...DEAL_DEFAULT_COLUMN_ORDER])
    setColumnSizing({})
  }, [])

  return {
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
    resetColumnsToDefault,
  }
}
