import {
  DEFAULT_REFERENCE_COLUMN_WIDTHS,
  type ReferenceColumnKey,
} from './reference-table-column-types'
import { loadColumnWidthsFromStorage } from '@/lib/table-column-sizing'
import type { ReferenceRow } from '../actions'

export type { ReferenceColumnKey }

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  internal_only: 'Intern',
  approved: 'Freigegeben',
  anonymized: 'Anonymisiert',
  /** Kundenfreigabe ausstehend (Epic 10) bzw. Legacy-Status pending – entspricht Badge „Freigabe ausstehend“. */
  approval_pending: 'Freigabe ausstehend',
}

/** Alle Referenzstatus-Optionen im Filter (fest, unabhängig von aktuell geladenen Zeilen). */
export const REFERENCE_TABLE_STATUS_FILTERS: readonly string[] = [
  'draft',
  'internal_only',
  'approval_pending',
  'approved',
  'anonymized',
]

export function referenceRowShowsApprovalPending(ref: ReferenceRow): boolean {
  if (String(ref.customer_approval_status ?? '').toLowerCase() === 'pending') return true
  return String(ref.status ?? '').toLowerCase() === 'pending'
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  completed: 'Abgeschlossen',
}

/** Spalten-Keys und Standard-Sichtbarkeit (Reihenfolge = Tabellenreihenfolge) */
export const COLUMN_KEYS = [
  'company',
  'title',
  'industry',
  'volume_eur',
  'status',
  'project_status',
  'updated_at',
  'tags',
  'country',
  'project_start',
  'project_end',
  'duration_months',
  'created_at',
] as const

export const DEFAULT_VISIBLE: Record<(typeof COLUMN_KEYS)[number], boolean> = {
  company: true,
  title: true,
  industry: true,
  volume_eur: false,
  status: true,
  project_status: false,
  updated_at: false,
  tags: false,
  country: false,
  project_start: false,
  project_end: false,
  duration_months: false,
  created_at: false,
}

export const COLUMN_LABELS: Record<(typeof COLUMN_KEYS)[number], string> = {
  status: 'Referenzstatus',
  company: 'Account',
  title: 'Titel',
  tags: 'Tags',
  industry: 'Industrie',
  volume_eur: 'Volumen',
  country: 'HQ',
  project_status: 'Projektstatus',
  project_start: 'Projektstart',
  project_end: 'Projektende',
  duration_months: 'Dauer (Monate)',
  created_at: 'Hinzugefügt am',
  updated_at: 'Letzte Änderung',
}

export const COLUMN_ORDER_STORAGE_KEY = 'dashboard-overview-column-order-v1'
export const COLUMN_VISIBLE_STORAGE_KEY = 'dashboard-overview-column-visible-v1'
export const COLUMN_SIZING_STORAGE_KEY = 'dashboard-overview-column-sizing-v1'
export const REFERENCE_SHOW_EXPIRED_CERTS_KEY = 'evidence-compliance-show-expired-v1'

export function loadVisibleColumnsFromStorage(): Record<
  (typeof COLUMN_KEYS)[number],
  boolean
> {
  if (typeof window === 'undefined') return { ...DEFAULT_VISIBLE }
  try {
    const raw = localStorage.getItem(COLUMN_VISIBLE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_VISIBLE }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_VISIBLE }
    const result = { ...DEFAULT_VISIBLE }
    for (const key of COLUMN_KEYS) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'boolean') {
        result[key] = value
      }
    }
    return result
  } catch {
    return { ...DEFAULT_VISIBLE }
  }
}

export function loadColumnOrderFromStorage(): ReferenceColumnKey[] {
  if (typeof window === 'undefined') return [...COLUMN_KEYS] as ReferenceColumnKey[]
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY)
    if (!raw) return [...COLUMN_KEYS] as ReferenceColumnKey[]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...COLUMN_KEYS] as ReferenceColumnKey[]
    const allowed = new Set<string>(COLUMN_KEYS)
    const seen = new Set<string>()
    const result: ReferenceColumnKey[] = []
    for (const item of parsed) {
      if (typeof item === 'string' && allowed.has(item) && !seen.has(item)) {
        seen.add(item)
        result.push(item as ReferenceColumnKey)
      }
    }
    for (const k of COLUMN_KEYS) {
      if (!seen.has(k)) result.push(k as ReferenceColumnKey)
    }
    return result
  } catch {
    return [...COLUMN_KEYS] as ReferenceColumnKey[]
  }
}

export function loadReferenceColumnWidthsFromStorage(): Record<
  ReferenceColumnKey,
  number
> {
  const stored = loadColumnWidthsFromStorage(COLUMN_SIZING_STORAGE_KEY, COLUMN_KEYS)
  return { ...DEFAULT_REFERENCE_COLUMN_WIDTHS, ...stored }
}
