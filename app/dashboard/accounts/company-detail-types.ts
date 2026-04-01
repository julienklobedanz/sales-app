import type {
  AccountDealRow,
  CompanyRefRow,
  CompanyStrategyRow,
  ContactPersonRow,
  StakeholderRow,
} from './actions'

export type CompanyDetailCompany = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
}

export type CompanyDetailClientProps = {
  company: CompanyDetailCompany
  strategy: CompanyStrategyRow | null
  stakeholders: StakeholderRow[]
  contacts: ContactPersonRow[]
  references: CompanyRefRow[]
  activeDeals: AccountDealRow[]
}
