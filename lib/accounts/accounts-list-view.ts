import { ROUTES } from '@/lib/routes'

/** Query-Parameter für die Partner-Listenansicht unter /dashboard/accounts */
export const ACCOUNTS_VIEW_PARAM = 'view'

export type AccountsListView = 'account' | 'partner'

export function parseAccountsListView(
  searchParams: URLSearchParams | { get: (key: string) => string | null } | null | undefined
): AccountsListView {
  const raw = searchParams?.get(ACCOUNTS_VIEW_PARAM)
  return raw === 'partner' ? 'partner' : 'account'
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

export function entityKindToListView(
  entityKind: string | null | undefined
): AccountsListView {
  return entityKind === 'partner' ? 'partner' : 'account'
}

export function accountsDetailHref(
  id: string,
  listView: AccountsListView = 'account'
): string {
  const base = ROUTES.accountsDetail(id)
  if (listView === 'partner') {
    return `${base}?${ACCOUNTS_VIEW_PARAM}=partner`
  }
  return base
}
