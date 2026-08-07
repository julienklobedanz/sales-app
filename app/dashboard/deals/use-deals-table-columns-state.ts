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

export function useDealsTableColumnsState() {
  const [columnOrder, setColumnOrder] = useState<string[]>([...DEAL_DEFAULT_COLUMN_ORDER])
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DEAL_COLUMNS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const normalized = parsed.filter((id): id is string => typeof id === 'string')
      if (normalized.length > 0) setColumnOrder(normalized)
    } catch {
      // ignore invalid local storage payload
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DEAL_COLUMNS_STORAGE_KEY, JSON.stringify(columnOrder))
  }, [columnOrder])

  useEffect(() => {
    setColumnSizing(
      loadColumnWidthsFromStorage(
        DEAL_COLUMN_SIZING_STORAGE_KEY,
        DEAL_RESIZABLE_COLUMN_IDS,
      ),
    )
  }, [])

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
