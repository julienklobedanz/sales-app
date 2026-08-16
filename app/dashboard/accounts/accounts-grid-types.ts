import type { AccountCardPrimaryAction } from '@/lib/accounts/account-card-primary-action'
import type { AccountStatusValue } from '@/lib/accounts/account-status'
import type { AccountEntityKind, NdaDisplayStatus } from '@/lib/accounts/account-entity'

export type CompanyCard = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  employee_count?: number | null
  is_favorite?: boolean | null
  entity_kind?: AccountEntityKind
  partner_category?: string | null
  linked_account_id?: string | null
  linked_account_name?: string | null
  nda_status?: NdaDisplayStatus
  account_status?: AccountStatusValue | null
  open_deals_count?: number | null
  contacts_count?: number | null
  reference_count?: number | null
  signal_count?: number | null
  latest_signal_summary?: string | null
  primary_action?: AccountCardPrimaryAction | null
  secondary_meta?: string | null
  sort_urgency_at?: string | null
}

export type EmployeeBand = 'any' | 'unknown' | 's_50' | 'm_200' | 'l_1000' | 'xl'

export type ReferencesFilter = 'any' | 'with' | 'without'

export type SortMode = 'activity' | 'az'
