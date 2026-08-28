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
  account_manager_avatar_url?: string | null
  sales_manager_id: string | null
  sales_manager_name: string | null
  sales_manager_avatar_url?: string | null
  status: DealStatus
  /** Cockpit-Gate: konditionaler RFP-Block (unabhängig vom Pipeline-Status). */
  is_rfp_mode: boolean
  tender_id: string | null
  tender: {
    id: string
    title: string
    company_id: string | null
    company_name: string | null
    company_logo_url: string | null
    procedure_type: string | null
    reference_number: string | null
    total_volume: string | null
  } | null
  expiry_date: string | null
  salesforce_opportunity_id?: string | null
  crm_opportunity_id?: string | null
  crm_source?: string | null
  crm_stage?: string | null
  crm_synced_at?: string | null
  created_at: string
  updated_at: string | null
  /** Verknüpfte Referenzen inkl. Logo für Listen-Anzeige */
  linked_refs?: {
    id: string
    title: string
    company_name: string
    logo_url?: string | null
  }[]
  /** Höchster `similarity_score` unter verknüpften Referenzen (0–1), sonst null */
  best_match_score: number | null
}

/**
 * Guardrail (Welle 4a / F2): `deals` bleibt ein schlanker Match-Kontext — kein CRM-Nachzug.
 * Kein Forecast, Aktivitäten-Log oder Kontakt-CRM in dieser Tabelle.
 * @see docs/arbeitspaket-deal-desk-reife-welle-4a.md
 */
export const DEAL_TABLE_ALLOWED_COLUMNS = [
  'id',
  'organization_id',
  'title',
  'company_id',
  'industry',
  'volume',
  'status',
  'is_rfp_mode',
  'tender_id',
  'expiry_date',
  'requirements_text',
  'account_manager_id',
  'sales_manager_id',
  'is_public',
  'incumbent_provider',
  'created_at',
  'updated_at',
  'created_by',
  'salesforce_opportunity_id',
  'crm_opportunity_id',
  'crm_source',
  'crm_stage',
  'crm_synced_at',
] as const

/** UI-/Join-Felder von `DealRow` — nicht als DB-Spalten anlegen. */
export const DEAL_ROW_DERIVED_FIELDS = [
  'company_name',
  'company_logo_url',
  'account_manager_name',
  'account_manager_avatar_url',
  'sales_manager_name',
  'sales_manager_avatar_url',
  'linked_refs',
  'best_match_score',
  'tender',
] as const

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
