import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatReferenceDate, type OrgDateDisplayFormat } from '@/lib/format'
import { COPY } from '@/lib/copy'

export type DealFactsDeal = {
  company_name: string | null
  industry: string | null
  volume: string | null
  expiry_date: string | null
  account_manager_name: string | null
  sales_manager_name: string | null
}

export type DealFactRow = {
  kind: 'text'
  label: string
  value: string
}

export function buildDealFactRows(
  deal: DealFactsDeal,
  options?: { dateDisplayFormat?: OrgDateDisplayFormat },
): DealFactRow[] {
  const industry = deal.industry ? formatIndustryDisplay(deal.industry) : '—'
  const closeDate = deal.expiry_date
    ? formatReferenceDate(deal.expiry_date, options?.dateDisplayFormat)
    : '—'

  const textRows: DealFactRow[] = [
    { kind: 'text', label: 'Branche', value: industry },
    { kind: 'text', label: 'Close', value: closeDate },
    {
      kind: 'text',
      label: COPY.roles.accountManager,
      value: deal.account_manager_name ?? '—',
    },
    {
      kind: 'text',
      label: COPY.roles.salesManager,
      value: deal.sales_manager_name ?? '—',
    },
  ]
  return textRows.filter((row) => row.value.trim() !== '' && row.value !== '—')
}
