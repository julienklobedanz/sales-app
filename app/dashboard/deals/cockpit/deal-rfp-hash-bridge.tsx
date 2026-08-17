'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import {
  resolveDealRfpHash,
  type DealHashSurface,
} from '@/lib/deals/deal-workspace-href'

export function DealRfpHashBridge({
  dealId,
  isRfpDeal,
  surface,
}: {
  dealId: string
  isRfpDeal: boolean
  surface: DealHashSurface
}) {
  const router = useRouter()

  useEffect(() => {
    function go() {
      const resolved = resolveDealRfpHash({
        hash: window.location.hash,
        isRfpDeal,
        current: surface,
        dealId,
      })
      if (!resolved) return
      router.replace(resolved.href)
    }
    go()
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [dealId, isRfpDeal, surface, router])

  return null
}
