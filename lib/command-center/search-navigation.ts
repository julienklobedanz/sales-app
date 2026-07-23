import { ROUTES } from '@/lib/routes'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import type { CommandSearchResult } from '@/lib/command-center/global-search'

export function hrefForCommandSearchResult(result: CommandSearchResult): string {
  switch (result.kind) {
    case 'account':
      return accountsDetailHref(result.id, 'account')
    case 'partner':
      return accountsDetailHref(result.id, 'partner')
    case 'rfp':
      return ROUTES.dealDeskProject(result.id)
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
      return ROUTES.settings
    case 'reference_document':
      return ROUTES.references.detail(result.referenceId)
    default:
      return ROUTES.home
  }
}

export function recentsKindToSearchKind(
  kind: 'reference' | 'account' | 'deal'
): CommandSearchResult['kind'] | null {
  if (kind === 'reference') return 'reference'
  if (kind === 'account') return 'account'
  return null
}
