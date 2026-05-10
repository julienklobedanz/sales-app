import type {
  AccountDealRow,
  CompanyRefRow,
  CompanyStrategyRow,
  ContactPersonRow,
  ExternalContactRow,
  StakeholderRow,
} from './actions'

export type CompanyDetailCompany = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  description: string | null
  employee_count: number | null
  account_status: string | null
  /** Interner Kontakt für Koordination der Kunden-Referenzfreigabe */
  internal_reference_approval_contact_id: string | null
}

export type CompanyDetailClientProps = {
  company: CompanyDetailCompany
  /** Eigenes Mandanten-Label für LinkedIn-Suche bei internen Kontakten */
  organizationName: string | null
  strategy: CompanyStrategyRow | null
  stakeholders: StakeholderRow[]
  internalContacts: ContactPersonRow[]
  externalContacts: ExternalContactRow[]
  references: CompanyRefRow[]
  activeDeals: AccountDealRow[]
  marketSignals: {
    championMoves: Array<{
      id: string
      personName: string
      personTitleBefore: string | null
      personTitleAfter: string | null
      changeSummary: string
      detectedAt: string
      eventKind: 'role_change' | 'news_mention'
      sourceUrl: string | null
    }>
    accountNews: Array<{
      id: string
      body: string
      sourceLabel: string | null
      sourceUrl: string | null
      publishedOn: string
      segment: 'customer' | 'prospect'
    }>
  }
  initialEditOpen?: boolean
}
