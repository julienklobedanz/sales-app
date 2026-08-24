import { ROUTES } from '@/lib/routes'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import { complianceReadHref } from '@/lib/compliance/compliance-list-view'
import type { CommandSearchResult } from '@/lib/command-center/global-search'

export function hrefForCommandSearchResult(result: CommandSearchResult): string {
  switch (result.kind) {
    case 'account':
      return accountsDetailHref(result.id)
    case 'rfp':
      return result.dealId ? ROUTES.deals.detailRfp(result.dealId) : ROUTES.deals.root
    case 'nda':
      return `${ROUTES.accountsDetail(result.companyId)}?openNda=1`
    case 'reference':
      return ROUTES.references.detail(result.id)
    case 'market_signal':
      return ROUTES.accountsDetail(result.companyId)
    case 'contact_external':
      return result.companyId ? ROUTES.accountsDetail(result.companyId) : ROUTES.accounts
    case 'contact_internal':
      return ROUTES.home
    case 'certificate':
      return complianceReadHref(result.id)
    case 'reference_document':
      return ROUTES.references.detail(result.referenceId)
    default:
      return ROUTES.home
  }
}
