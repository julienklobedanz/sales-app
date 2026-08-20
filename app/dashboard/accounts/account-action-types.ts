export type { AccountStatusValue } from '@/lib/accounts/account-status'

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

/** Empfohlene Referenz für Smart-Matching inkl. Score 0–100 und Begründung */
export type RecommendedReference = {
  id: string
  title: string
  company_name: string | null
  matchType: 'industry_and_tags' | 'tags_only' | 'industry_only'
  /** Score 0–100 (Branche 50, Themen 30, Größe/Region 20) */
  score: number
  /** Für Tooltip: Warum dieses Match? */
  matchReasons: { industry: boolean; tags: boolean; sizeRegion: boolean }
}

export type AccountDealRow = {
  id: string
  title: string
  volume: string | null
  status: string
  expiry_date: string | null
  created_at: string
  updated_at: string | null
}
