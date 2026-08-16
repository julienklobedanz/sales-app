'use client'

import { useEffect, useState } from 'react'
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

function loadDealColumnOrderFromStorage(): string[] {
  if (typeof window === 'undefined') return [...DEAL_DEFAULT_COLUMN_ORDER]
  try {
    const raw = window.localStorage.getItem(DEAL_COLUMNS_STORAGE_KEY)
    if (!raw) return [...DEAL_DEFAULT_COLUMN_ORDER]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEAL_DEFAULT_COLUMN_ORDER]
    const normalized = parsed.filter((id): id is string => typeof id === 'string')
    return normalized.length > 0 ? normalized : [...DEAL_DEFAULT_COLUMN_ORDER]
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

  return {
    columnOrder,
    setColumnOrder,
    columnSizing,
    setColumnSizing,
  }
}
