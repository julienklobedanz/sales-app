export type AccountDetailCompany = {
  id: string
  name: string
  entity_kind?: 'account' | 'partner' | null
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  description: string | null
  employee_count: number | null
  account_status: string | null
}
