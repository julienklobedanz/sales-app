'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import {
  parseDealWorkspaceAreaFromPathname,
  resolveDealRfpHash,
  type DealHashSurface,
} from '@/lib/deals/deal-workspace-href'
import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'

export function DealRfpHashBridge({
  dealId,
  isRfpDeal,
  surface,
  currentArea,
}: {
  dealId: string
  isRfpDeal: boolean
  surface: DealHashSurface
  currentArea?: DealWorkspaceArea | null
}) {
  const router = useRouter()

  useEffect(() => {
    function go() {
      const resolved = resolveDealRfpHash({
        hash: window.location.hash,
        isRfpDeal,
        current: surface,
        currentArea:
          currentArea ?? parseDealWorkspaceAreaFromPathname(window.location.pathname),
        dealId,
      })
      if (!resolved) return
      router.replace(resolved.href)
    }
    go()
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [dealId, isRfpDeal, surface, currentArea, router])

  return null
}
