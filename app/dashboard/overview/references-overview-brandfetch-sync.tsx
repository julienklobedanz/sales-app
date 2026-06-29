'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { enrichReferencedCompaniesMissingBrandfetch } from '@/lib/references/library/sync-company-brandfetch'
import { resetCompanyBrandfetchRetryCache } from '@/lib/accounts/company-brandfetch-retry-client'

/**
 * Nachladen fehlender Logos/Branchen beim Öffnen der Referenzen-Übersicht.
 */
export function ReferencesOverviewBrandfetchSync({
  companyIds,
}: {
  companyIds: string[]
}) {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    const ids = [...new Set(companyIds.filter(Boolean))]
    if (ids.length === 0 || started.current) return
    started.current = true

    resetCompanyBrandfetchRetryCache()

    void enrichReferencedCompaniesMissingBrandfetch(ids).then((result) => {
      if (result.synced > 0) {
        router.refresh()
      }
    })
  }, [companyIds, router])

  return null
}
