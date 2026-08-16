export const ACCOUNT_COLUMN_KEYS = [
  'company',
  'proofs',
  'deals',
  'nda',
  'industry',
  'headquarters',
] as const

export type AccountColumnKey = (typeof ACCOUNT_COLUMN_KEYS)[number]

export const ACCOUNT_DEFAULT_VISIBLE: Record<AccountColumnKey, boolean> = {
  company: true,
  proofs: true,
  deals: true,
  nda: true,
  industry: false,
  headquarters: false,
}

export const ACCOUNT_COLUMN_LABELS: Record<AccountColumnKey, string> = {
  company: 'Firma',
  proofs: 'Beweise',
  deals: 'Offene Deals',
  nda: 'NDA',
  industry: 'Branche',
  headquarters: 'Standort',
}

export const ACCOUNT_COLUMNS_STORAGE_KEY = 'refstack:accounts:column-order-v1'
export const ACCOUNT_COLUMN_VISIBLE_STORAGE_KEY = 'refstack:accounts:column-visible-v1'
export const ACCOUNT_COLUMN_SIZING_STORAGE_KEY = 'refstack:accounts:column-sizing-v1'

export const ACCOUNT_DEFAULT_COLUMN_ORDER: AccountColumnKey[] = [...ACCOUNT_COLUMN_KEYS]

export const ACCOUNT_RESIZABLE_COLUMN_IDS: AccountColumnKey[] = [...ACCOUNT_COLUMN_KEYS]

export type AccountsNdaFilter = 'all' | 'active' | 'expiring' | 'none'
