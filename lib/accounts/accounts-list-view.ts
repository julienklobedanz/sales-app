import { ROUTES } from '@/lib/routes'

/** Query-Parameter für die Lese-Ansicht unter /dashboard/accounts (`?view=lesen`). */
const ACCOUNTS_VIEW_PARAM = 'view'

export type AccountsCollectionLayout = 'table' | 'inbox'

export function parseAccountsCollectionLayout(
  searchParams:
    | URLSearchParams
    | { get: (key: string) => string | null }
    | null
    | undefined,
): AccountsCollectionLayout {
  return searchParams?.get(ACCOUNTS_VIEW_PARAM) === 'lesen' ? 'inbox' : 'table'
}

export function accountsReadHref(id: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams()
  params.set(ACCOUNTS_VIEW_PARAM, 'lesen')
  params.set('id', id)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value)
    }
  }
  return `${ROUTES.accounts}?${params.toString()}`
}

export function accountsDetailHref(id: string): string {
  return ROUTES.accountsDetail(id)
}
