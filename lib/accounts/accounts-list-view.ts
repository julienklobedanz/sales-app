import { ROUTES } from '@/lib/routes'

/** Query-Parameter für die Partner-Listenansicht unter /dashboard/accounts */
const ACCOUNTS_VIEW_PARAM = 'view'

export type AccountsListView = 'account' | 'partner'

export function parseAccountsListView(
  searchParams:
    | URLSearchParams
    | { get: (key: string) => string | null }
    | null
    | undefined,
): AccountsListView {
  const raw = searchParams?.get(ACCOUNTS_VIEW_PARAM)
  return raw === 'partner' ? 'partner' : 'account'
}

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

export function accountsListHref(view: AccountsListView = 'account'): string {
  if (view === 'partner') {
    return `${ROUTES.accounts}?${ACCOUNTS_VIEW_PARAM}=partner`
  }
  return ROUTES.accounts
}

export function accountsListTitle(view: AccountsListView): string {
  return view === 'partner' ? 'Partner' : 'Accounts'
}

export function accountsDetailHref(
  id: string,
  listView: AccountsListView = 'account',
): string {
  const base = ROUTES.accountsDetail(id)
  if (listView === 'partner') {
    return `${base}?${ACCOUNTS_VIEW_PARAM}=partner`
  }
  return base
}
