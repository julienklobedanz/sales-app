import { ROUTES } from '@/lib/routes'
import type { CommandSearchResult } from '@/lib/command-center/global-search'

export function hrefForCommandSearchResult(result: CommandSearchResult): string {
  switch (result.kind) {
    case 'account':
      return ROUTES.accountsDetail(result.id)
    case 'rfp':
      return ROUTES.dealDeskProject(result.id)
    case 'nda':
      return `${ROUTES.accountsDetail(result.companyId)}?openNda=1`
    case 'reference':
      return ROUTES.evidence.detail(result.id)
    case 'market_signal':
      return ROUTES.accountsDetail(result.companyId)
    case 'contact_external':
      return result.companyId ? ROUTES.accountsDetail(result.companyId) : ROUTES.accounts
    case 'contact_internal':
      return ROUTES.home
    case 'certificate':
      return ROUTES.settings
    case 'reference_document':
      return ROUTES.evidence.detail(result.referenceId)
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
