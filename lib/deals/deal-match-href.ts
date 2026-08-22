import { ROUTES } from '@/lib/routes'

/** Boolean-Flag am Deal-Cockpit — Query-Grammatik wie `view=lesen` und `eintrag=`. */
export const DEAL_MATCH_PARAM = 'match'
export const DEAL_MATCH_PARAM_VALUE = '1'

export function dealMatchHref(dealId: string): string {
  return `${ROUTES.deals.detail(dealId)}?${DEAL_MATCH_PARAM}=${DEAL_MATCH_PARAM_VALUE}`
}

export function parseDealMatchOpen(
  searchParams: { get: (key: string) => string | null } | null | undefined,
): boolean {
  return searchParams?.get(DEAL_MATCH_PARAM) === DEAL_MATCH_PARAM_VALUE
}
