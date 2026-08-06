'use client'

import { useCallback, useEffect, useState } from 'react'

import type { ReferenceAssetRow, ReferenceRow } from '@/app/dashboard/actions'
import { getReferenceAssets } from '@/app/dashboard/actions'

export function useReferenceDetailSheet() {
  const [selectedRef, setSelectedRef] = useState<ReferenceRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailAssets, setDetailAssets] = useState<ReferenceAssetRow[]>([])
  const [detailAssetsLoading, setDetailAssetsLoading] = useState(false)

  const handleReferenceSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setDetailAssets([])
      setDetailAssetsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedRef?.id || !sheetOpen) return
    let cancelled = false
    void (async () => {
      setDetailAssetsLoading(true)
      try {
        const assets = await getReferenceAssets(selectedRef.id)
        if (!cancelled) setDetailAssets(assets)
      } finally {
        if (!cancelled) setDetailAssetsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedRef?.id, sheetOpen])

  return {
    selectedRef,
    setSelectedRef,
    sheetOpen,
    setSheetOpen,
    detailAssets,
    setDetailAssets,
    detailAssetsLoading,
    handleReferenceSheetOpenChange,
  }
}
