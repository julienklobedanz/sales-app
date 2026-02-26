export type DealStatus =
  | 'in_negotiation'
  | 'rfp_phase'
  | 'won'
  | 'lost'
  | 'on_hold'

export type DealRow = {
  id: string
  title: string
  company_id: string | null
  company_name: string | null
  industry: string | null
  volume: string | null
  is_public: boolean
  account_manager_id: string | null
  account_manager_name: string | null
  sales_manager_id: string | null
  sales_manager_name: string | null
  status: DealStatus
  expiry_date: string | null
  created_at: string
  updated_at: string | null
}

export type DealWithReferences = DealRow & {
  references: { id: string; title: string; company_name: string }[]
}

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  in_negotiation: 'In Verhandlung',
  rfp_phase: 'RFP Phase',
  won: 'Gewonnen',
  lost: 'Verloren',
  on_hold: 'Pausiert',
}
