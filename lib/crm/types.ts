export type CrmProvider = 'hubspot' | 'pipedrive' | 'salesforce' | 'zoho'

export type CrmConnectionStatus = 'connected' | 'disconnected' | 'error'

export interface CrmOpportunityCandidate {
  externalOpportunityId: string
  title: string
  amount?: number | null
  stage?: string | null
  closeDate?: string | null
}

export interface CrmAccountCandidate {
  externalAccountId: string
  name: string
  website?: string | null
  opportunities: CrmOpportunityCandidate[]
}

export type CrmImportMatchStatus = 'new' | 'linked' | 'existing'

export interface CrmImportPreviewItem extends CrmAccountCandidate {
  matchStatus: CrmImportMatchStatus
  existingCompanyId?: string
  selected?: boolean
}

export interface CrmImportResult {
  success: boolean
  createdAccounts: number
  linkedAccounts: number
  skippedAccounts: number
  createdDeals: number
  skippedDeals: number
  enrichedAccounts: number
  error?: string
}

export interface OrganizationCrmConnectionRow {
  id: string
  organization_id: string
  provider: CrmProvider
  status: CrmConnectionStatus
  access_token_enc: string
  refresh_token_enc: string | null
  expires_at: string | null
  external_account_id: string | null
  /** HubSpot Deal-Property für Vertragsende; null/leer = Default. */
  hubspot_contract_end_property?: string | null
  connected_by: string | null
  last_sync_at: string | null
  created_at: string
  updated_at: string
}
