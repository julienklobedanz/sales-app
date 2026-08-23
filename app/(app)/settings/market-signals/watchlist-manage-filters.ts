import type { CompanyWatchSegment } from '@/app/(app)/settings/market-signals/company-segment-switch'

import type { ManageCompany, WatchedStakeholder } from './watchlist-manage-types'

function isBestandskunde(accountStatus: string | null): boolean {
  const s = String(accountStatus ?? '').trim()
  return s === 'active_customer' || s === 'former_customer' || s === 'at_risk'
}

export function compareWatchlistCompanies(a: ManageCompany, b: ManageCompany): number {
  if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1
  return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
}

export function compareStakeholders(a: WatchedStakeholder, b: WatchedStakeholder): number {
  if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1
  return a.personName.localeCompare(b.personName, 'de', { sensitivity: 'base' })
}

export function filterCompaniesBySegment(
  rows: ManageCompany[],
  companySegment: CompanyWatchSegment,
): ManageCompany[] {
  return rows.filter((row) => {
    if (companySegment === 'all') return true
    return companySegment === 'bestand'
      ? isBestandskunde(row.accountStatus)
      : !isBestandskunde(row.accountStatus)
  })
}

export function filterAndSortWatchlistCompanies({
  segmentFiltered,
  query,
  onlyWatched,
}: {
  segmentFiltered: ManageCompany[]
  query: string
  onlyWatched: boolean
}): ManageCompany[] {
  const q = query.trim().toLowerCase()
  const searched = q
    ? segmentFiltered.filter((row) => row.name.toLowerCase().includes(q))
    : segmentFiltered
  const watched = onlyWatched ? searched.filter((row) => row.isFollowing) : searched
  return [...watched].sort(compareWatchlistCompanies)
}

export function filterAndSortStakeholders(
  rows: WatchedStakeholder[],
  stakeholderQuery: string,
): WatchedStakeholder[] {
  const q = stakeholderQuery.trim().toLowerCase()
  const searched = q
    ? rows.filter((row) => {
        const hay = `${row.personName} ${row.companyName ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
    : rows
  return [...searched].sort(compareStakeholders)
}

export function companyWatchlistEmptyMessage({
  query,
  onlyWatched,
  watchedInSegment,
  companySegment,
}: {
  query: string
  onlyWatched: boolean
  watchedInSegment: number
  companySegment: CompanyWatchSegment
}): string {
  if (query.trim()) return 'Keine Accounts gefunden.'
  if (onlyWatched) {
    return watchedInSegment === 0
      ? 'In diesem Segment wird noch kein Account beobachtet.'
      : 'Keine Treffer für „Nur Beobachtete“ mit der aktuellen Suche.'
  }
  if (companySegment === 'bestand') {
    return 'Keine Bestandskunden in RefStack — legen Sie Accounts mit Status „Aktiver Kunde“, „Ehemaliger Kunde“ oder „Account at Risk“ an.'
  }
  if (companySegment === 'neu') {
    return 'Keine Neukunden in RefStack — Targets und Accounts ohne Kundenstatus erscheinen hier.'
  }
  return 'Noch keine Accounts in RefStack.'
}
