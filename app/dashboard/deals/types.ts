export type DealStatus =
  | 'open'
  | 'rfp'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'withdrawn'
  | 'archived'

export type DealRow = {
  id: string
  title: string
  company_id: string | null
  company_name: string | null
  company_logo_url?: string | null
  industry: string | null
  volume: string | null
  requirements_text?: string | null
  incumbent_provider: string | null
  is_public: boolean
  account_manager_id: string | null
  account_manager_name: string | null
  sales_manager_id: string | null
  sales_manager_name: string | null
  status: DealStatus
  expiry_date: string | null
  created_at: string
  updated_at: string | null
  /** Verknüpfte Referenzen inkl. Logo für Listen-Anzeige */
  linked_refs?: { id: string; title: string; company_name: string; logo_url?: string | null }[]
  /** Höchster `similarity_score` unter verknüpften Referenzen (0–1), sonst null */
  best_match_score: number | null
}

export type DealWithReferences = DealRow & {
  references: Array<{
    id: string
    title: string
    company_name: string
    logo_url?: string | null
    summary?: string | null
    tags?: string | null
    similarity_score?: number | null
  }>
}

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  open: 'Offen',
  rfp: 'RFP',
  negotiation: 'Verhandlung',
  won: 'Gewonnen',
  lost: 'Verloren',
  withdrawn: 'Zurückgezogen',
  archived: 'Archiviert',
}
