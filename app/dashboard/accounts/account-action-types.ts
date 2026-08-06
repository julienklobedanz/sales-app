export type { AccountStatusValue } from '@/lib/accounts/account-status'

/**
 * App-DTO für Strategies (Aliases: company_goals←main_goals, competition←competitive_situation).
 * `value_proposition` existiert in der DB, fehlt ggf. noch in `database.types.ts`.
 */
export type CompanyStrategyRow = {
  id: string
  company_id: string
  company_goals: string | null
  red_flags: string | null
  competition: string | null
  next_steps: string | null
  value_proposition: string | null
  metrics_pain: string | null
  mh_assessment: Record<string, unknown> | null
  updated_at: string | null
}

export type { StakeholderRole } from '@/lib/accounts/stakeholder-role'
import type { StakeholderRole } from '@/lib/accounts/stakeholder-role'

/** An `Tables<'stakeholders'>` angeglichen; `role` auf App-Enum eingeengt. */
export type StakeholderRow = {
  id: string
  company_id: string
  name: string
  title: string | null
  role: StakeholderRole
  influence_level: string | null
  attitude: string | null
  notes: string | null
  linkedin_url: string | null
  priorities_topics: string | null
  last_contact_at: string | null
  last_interaction_at: string | null
  sentiment: string | null
  created_at: string
  updated_at: string | null
}

export type CompanyRefRow = {
  id: string
  title: string
  status: string
  project_status: string | null
  industry?: string | null
  country?: string | null
  created_at: string
}

/** Opportunity Roadmap: ein Projekt pro Zeile */
export type RoadmapProjectRow = {
  id: string
  company_id: string
  project_name: string
  estimated_value: string | null
  status: string | null
  target_date: string | null
  tags: string | null
  created_at: string
  updated_at: string | null
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

/** An `Tables<'contact_persons'>` angeglichen (ohne organization_id). */
export type ContactPersonRow = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  role: string | null
  position: string | null
  avatar_url: string | null
  last_interaction_at: string | null
  created_at: string
  updated_at: string | null
}

export type ExternalContactRow = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  /** Jobtitel (z. B. CIO), nicht Miller-Heiman-Rolle */
  role: string | null
  buying_center_role?: StakeholderRole | null
  last_interaction_at: string | null
  created_at: string
  updated_at: string | null
}

export type AccountDealRow = {
  id: string
  title: string
  volume: string | null
  status: string
  expiry_date: string | null
  salesforce_opportunity_id?: string | null
  crm_opportunity_id?: string | null
  crm_source?: string | null
  crm_synced_at?: string | null
  created_at: string
  updated_at: string | null
}

/** Expiring Deals für einen Account (Market Signals Tab). */
export type DealSignalRow = {
  id: string
  title: string
  expiry_date: string | null
  volume: string | null
  incumbent_provider: string | null
  status: string
}
