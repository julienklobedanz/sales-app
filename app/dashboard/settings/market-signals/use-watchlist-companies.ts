'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  setCompaniesWatchlistState,
  setCompanyWatchlistState,
  watchCompanyFromSuggestion,
} from '@/app/dashboard/market-signals/actions'
import type { CompanyWatchSegment } from '@/app/dashboard/settings/market-signals/company-segment-switch'
import type { CompanySearchSuggestion } from '@/app/dashboard/references/new/actions'

import {
  companyWatchlistEmptyMessage,
  compareWatchlistCompanies,
  filterAndSortWatchlistCompanies,
  filterCompaniesBySegment,
} from './watchlist-manage-filters'
import type { ManageCompany } from './watchlist-manage-types'

export function useWatchlistCompanies(companies: ManageCompany[]) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [companySegment, setCompanySegment] = useState<CompanyWatchSegment>('neu')
  const [onlyWatched, setOnlyWatched] = useState(false)
  const [addCompanyQuery, setAddCompanyQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [rows, setRows] = useState(companies)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [addPending, setAddPending] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(companies)
  }, [companies])

  const segmentFiltered = useMemo(
    () => filterCompaniesBySegment(rows, companySegment),
    [companySegment, rows],
  )

  const filteredCompanies = useMemo(
    () =>
      filterAndSortWatchlistCompanies({
        segmentFiltered,
        query,
        onlyWatched,
      }),
    [onlyWatched, query, segmentFiltered],
  )

  const watchedInSegment = useMemo(
    () => segmentFiltered.filter((row) => row.isFollowing).length,
    [segmentFiltered],
  )

  const emptyMessage = useMemo(
    () =>
      companyWatchlistEmptyMessage({
        query,
        onlyWatched,
        watchedInSegment,
        companySegment,
      }),
    [companySegment, onlyWatched, query, watchedInSegment],
  )

  function toggleCompany(companyId: string, nextValue: boolean) {
    setRows((prev) =>
      prev
        .map((row) => (row.id === companyId ? { ...row, isFollowing: nextValue } : row))
        .sort(compareWatchlistCompanies),
    )
    setPendingId(companyId)
    startTransition(async () => {
      const result = await setCompanyWatchlistState(companyId, nextValue)
      setPendingId(null)
      if (!result.success) {
        setRows((prev) =>
          prev
            .map((row) =>
              row.id === companyId ? { ...row, isFollowing: !nextValue } : row,
            )
            .sort(compareWatchlistCompanies),
        )
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
      }
    })
  }

  function bulkSetFollowing(nextValue: boolean) {
    const ids = filteredCompanies
      .filter((row) => row.isFollowing !== nextValue)
      .map((row) => row.id)
    if (ids.length === 0) {
      toast.message(
        nextValue
          ? 'Alle sichtbaren Accounts sind bereits aktiv.'
          : 'Keine aktiven Accounts in der Ansicht.',
      )
      return
    }
    const idSet = new Set(ids)
    setRows((prev) =>
      prev
        .map((row) => (idSet.has(row.id) ? { ...row, isFollowing: nextValue } : row))
        .sort(compareWatchlistCompanies),
    )
    setBulkPending(true)
    startTransition(async () => {
      const result = await setCompaniesWatchlistState(ids, nextValue)
      setBulkPending(false)
      if (!result.success) {
        setRows(companies)
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
        return
      }
      toast.success(
        nextValue
          ? `${ids.length} Account${ids.length === 1 ? '' : 's'} aktiviert`
          : `${ids.length} Account${ids.length === 1 ? '' : 's'} deaktiviert`,
      )
    })
  }

  async function onAddCompanySuggestion(suggestion: CompanySearchSuggestion) {
    setAddPending(true)
    try {
      const result = await watchCompanyFromSuggestion({
        id: suggestion.id,
        name: suggestion.name,
      })
      if (!result.success) {
        toast.error(result.error ?? 'Account konnte nicht hinzugefügt werden')
        return
      }
      setRows((prev) => {
        const without = prev.filter((row) => row.id !== result.company.id)
        return [...without, result.company].sort(compareWatchlistCompanies)
      })
      setAddCompanyQuery('')
      setAddDialogOpen(false)
      toast.success(`${result.company.name} wird beobachtet`)
      router.refresh()
    } finally {
      setAddPending(false)
    }
  }

  return {
    query,
    setQuery,
    companySegment,
    setCompanySegment,
    onlyWatched,
    setOnlyWatched,
    addCompanyQuery,
    setAddCompanyQuery,
    addDialogOpen,
    setAddDialogOpen,
    segmentFiltered,
    filteredCompanies,
    watchedInSegment,
    emptyMessage,
    pendingId,
    bulkPending,
    addPending,
    isPending,
    toggleCompany,
    bulkSetFollowing,
    onAddCompanySuggestion,
  }
}
