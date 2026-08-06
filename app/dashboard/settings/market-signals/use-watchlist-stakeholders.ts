'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { setChampionWatchlistState } from '@/app/dashboard/market-signals/actions'

import {
  compareStakeholders,
  filterAndSortStakeholders,
} from './watchlist-manage-filters'
import type { WatchedStakeholder } from './watchlist-manage-types'

export function useWatchlistStakeholders(watchedStakeholders: WatchedStakeholder[]) {
  const router = useRouter()
  const [stakeholderQuery, setStakeholderQuery] = useState('')
  const [stakeholderRows, setStakeholderRows] = useState(watchedStakeholders)
  const [newPersonName, setNewPersonName] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [pendingStakeholderKey, setPendingStakeholderKey] = useState<string | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setStakeholderRows(watchedStakeholders)
  }, [watchedStakeholders])

  const filteredStakeholders = useMemo(
    () => filterAndSortStakeholders(stakeholderRows, stakeholderQuery),
    [stakeholderQuery, stakeholderRows],
  )

  function addStakeholder() {
    const personName = newPersonName.trim()
    const companyName = newCompanyName.trim()
    if (!personName) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }
    const key = personName.toLowerCase().replace(/\s+/g, ' ')
    const optimistic: WatchedStakeholder = {
      key,
      personName,
      companyName: companyName || null,
      personTitle: null,
      createdAt: new Date().toISOString(),
      isFollowing: true,
    }
    setStakeholderRows((prev) => {
      const without = prev.filter((row) => row.key !== key)
      return [...without, optimistic].sort(compareStakeholders)
    })
    setPendingStakeholderKey(key)
    startTransition(async () => {
      const result = await setChampionWatchlistState(
        personName,
        true,
        companyName || null,
      )
      setPendingStakeholderKey(null)
      if (!result.success) {
        setStakeholderRows(watchedStakeholders)
        toast.error(result.error ?? 'Überwachung konnte nicht gestartet werden')
        return
      }
      setNewPersonName('')
      setNewCompanyName('')
      router.refresh()
    })
  }

  function toggleStakeholder(row: WatchedStakeholder, nextValue: boolean) {
    setStakeholderRows((prev) =>
      prev
        .map((item) =>
          item.key === row.key ? { ...item, isFollowing: nextValue } : item,
        )
        .sort(compareStakeholders),
    )
    setPendingStakeholderKey(row.key)
    startTransition(async () => {
      const result = await setChampionWatchlistState(
        row.personName,
        nextValue,
        row.companyName,
      )
      setPendingStakeholderKey(null)
      if (!result.success) {
        setStakeholderRows((prev) =>
          prev
            .map((item) =>
              item.key === row.key ? { ...item, isFollowing: !nextValue } : item,
            )
            .sort(compareStakeholders),
        )
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
      }
    })
  }

  return {
    stakeholderQuery,
    setStakeholderQuery,
    filteredStakeholders,
    newPersonName,
    setNewPersonName,
    newCompanyName,
    setNewCompanyName,
    pendingStakeholderKey,
    isPending,
    addStakeholder,
    toggleStakeholder,
  }
}
