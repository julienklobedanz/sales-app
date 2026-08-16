'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ColumnSizingState, VisibilityState } from '@tanstack/react-table'

import {
  loadColumnWidthsFromStorage,
  saveColumnWidthsToStorage,
} from '@/lib/table-column-sizing'
import {
  ACCOUNT_COLUMN_KEYS,
  ACCOUNT_COLUMN_SIZING_STORAGE_KEY,
  ACCOUNT_COLUMN_VISIBLE_STORAGE_KEY,
  ACCOUNT_COLUMNS_STORAGE_KEY,
  ACCOUNT_DEFAULT_COLUMN_ORDER,
  ACCOUNT_DEFAULT_VISIBLE,
  ACCOUNT_RESIZABLE_COLUMN_IDS,
  type AccountColumnKey,
} from '@/lib/accounts/account-collection-columns'

const ALLOWED = new Set<string>(ACCOUNT_COLUMN_KEYS)

export function normalizeAccountColumnOrder(parsed: unknown): AccountColumnKey[] {
  const seen = new Set<string>()
  const result: AccountColumnKey[] = []
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (typeof item === 'string' && ALLOWED.has(item) && !seen.has(item)) {
        seen.add(item)
        result.push(item as AccountColumnKey)
      }
    }
  }
  for (const id of ACCOUNT_DEFAULT_COLUMN_ORDER) {
    if (!seen.has(id)) result.push(id)
  }
  return result
}

function loadOrder(): AccountColumnKey[] {
  if (typeof window === 'undefined') return [...ACCOUNT_DEFAULT_COLUMN_ORDER]
  try {
    const raw = window.localStorage.getItem(ACCOUNT_COLUMNS_STORAGE_KEY)
    if (!raw) return [...ACCOUNT_DEFAULT_COLUMN_ORDER]
    return normalizeAccountColumnOrder(JSON.parse(raw))
  } catch {
    return [...ACCOUNT_DEFAULT_COLUMN_ORDER]
  }
}

function loadVisible(): VisibilityState {
  if (typeof window === 'undefined') return { ...ACCOUNT_DEFAULT_VISIBLE }
  try {
    const raw = window.localStorage.getItem(ACCOUNT_COLUMN_VISIBLE_STORAGE_KEY)
    if (!raw) return { ...ACCOUNT_DEFAULT_VISIBLE }
    const parsed = JSON.parse(raw) as Record<string, boolean>
    const next: VisibilityState = { ...ACCOUNT_DEFAULT_VISIBLE }
    for (const key of ACCOUNT_COLUMN_KEYS) {
      if (typeof parsed[key] === 'boolean') next[key] = parsed[key]
    }
    return next
  } catch {
    return { ...ACCOUNT_DEFAULT_VISIBLE }
  }
}

export function useAccountsTableColumnsState() {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => loadOrder())
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    loadVisible(),
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadColumnWidthsFromStorage(
      ACCOUNT_COLUMN_SIZING_STORAGE_KEY,
      ACCOUNT_RESIZABLE_COLUMN_IDS,
    ),
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ACCOUNT_COLUMNS_STORAGE_KEY, JSON.stringify(columnOrder))
  }, [columnOrder])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      ACCOUNT_COLUMN_VISIBLE_STORAGE_KEY,
      JSON.stringify(columnVisibility),
    )
  }, [columnVisibility])

  useEffect(() => {
    if (Object.keys(columnSizing).length === 0) return
    saveColumnWidthsToStorage(ACCOUNT_COLUMN_SIZING_STORAGE_KEY, columnSizing)
  }, [columnSizing])

  const resetColumnsToDefault = useCallback(() => {
    setColumnOrder([...ACCOUNT_DEFAULT_COLUMN_ORDER])
    setColumnVisibility({ ...ACCOUNT_DEFAULT_VISIBLE })
    setColumnSizing({})
  }, [])

  return {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    resetColumnsToDefault,
  }
}
