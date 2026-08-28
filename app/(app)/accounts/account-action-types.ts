import type { ResolvedDealDeadline } from '@/lib/deals/resolve-deal-deadline'

export type CompanyRefRow = {
  id: string
  title: string
  status: string
  project_status: string | null
  industry?: string | null
  country?: string | null
  created_at: string
  summary?: string | null
  project_start?: string | null
  project_end?: string | null
  project_year?: number | null
}

export type AccountDealRow = {
  id: string
  title: string
  volume: string | null
  status: string
  expiry_date: string | null
  deadline: ResolvedDealDeadline
  created_at: string
  updated_at: string | null
}
