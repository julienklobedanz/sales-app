import { COPY } from '@/lib/copy'

import type { DealStatus } from './types'

export type StatusFilterValue = 'all' | DealStatus

export const DEAL_COLUMNS_STORAGE_KEY = 'refstack:deals:column-order-v3'
export const DEAL_COLUMN_SIZING_STORAGE_KEY = 'refstack:deals:column-sizing-v2'

export const DEAL_COL_LABELS = COPY.deals.columnViewLabels

export const DEAL_RESIZABLE_COLUMN_IDS = [
  'status',
  'title',
  'company_name',
  'volume',
  'proof',
  'expiry_date',
  'account_manager_name',
  'sales_manager_name',
] as const

export const DEAL_DEFAULT_COLUMN_ORDER = [
  'company_name',
  'title',
  'status',
  'proof',
  'expiry_date',
  'volume',
  'account_manager_name',
  'sales_manager_name',
] as const

export const STATUS_FILTER_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: COPY.deals.filterStatusAll },
  { value: 'negotiation', label: COPY.deals.filterStatusNegotiation },
  { value: 'rfp', label: COPY.deals.filterStatusRfp },
  { value: 'won', label: COPY.deals.filterStatusWon },
  { value: 'lost', label: COPY.deals.filterStatusLost },
]

export const DEAL_INITIAL_COLUMN_VISIBILITY = {
  account_manager_name: false,
  sales_manager_name: false,
  status: true,
  company_name: true,
  title: true,
  volume: true,
  proof: true,
  expiry_date: true,
} as const
