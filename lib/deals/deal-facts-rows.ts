import { formatIndustryDisplay } from '@/lib/constants/industries'
import { buildCrmDealUrl, dealHasCrmSync } from '@/lib/crm/deal-links'
import { formatCrmStageLabel } from '@/lib/crm/format-crm-stage-label'
import { formatDealVolume } from '@/lib/format'
import { COPY } from '@/lib/copy'

export type DealFactsDeal = {
  company_name: string | null
  industry: string | null
  volume: string | null
  expiry_date: string | null
  account_manager_name: string | null
  sales_manager_name: string | null
  crm_stage?: string | null
  crm_opportunity_id?: string | null
  crm_source?: string | null
  salesforce_opportunity_id?: string | null
}

export type DealFactRow =
  | { kind: 'text'; label: string; value: string }
  | { kind: 'link'; label: string; href: string; linkLabel: string }

export function buildDealFactRows(
  deal: DealFactsDeal,
  options?: { hubspotPortalId?: string | null }
): DealFactRow[] {
  const industry = deal.industry ? formatIndustryDisplay(deal.industry) : '—'

  const rows: DealFactRow[] = [
    { kind: 'text', label: 'Account', value: deal.company_name ?? '—' },
    { kind: 'text', label: 'Branche', value: industry },
    { kind: 'text', label: 'Volumen', value: formatDealVolume(deal.volume) },
    { kind: 'text', label: 'Close', value: deal.expiry_date ?? '—' },
    { kind: 'text', label: COPY.roles.accountManager, value: deal.account_manager_name ?? '—' },
    { kind: 'text', label: COPY.roles.salesManager, value: deal.sales_manager_name ?? '—' },
  ]

  if (!dealHasCrmSync(deal)) {
    return rows
  }

  const stageLabel = formatCrmStageLabel(deal.crm_stage)
  if (stageLabel) {
    rows.push({ kind: 'text', label: COPY.deals.cockpit.crmStage, value: stageLabel })
  }

  const crmLink = buildCrmDealUrl(deal, { hubspotPortalId: options?.hubspotPortalId })
  if (crmLink && crmLink.href !== '#') {
    rows.push({
      kind: 'link',
      label: COPY.deals.cockpit.crmOpportunity,
      href: crmLink.href,
      linkLabel: COPY.deals.cockpit.openInCrm(crmLink.label),
    })
  }

  return rows
}
