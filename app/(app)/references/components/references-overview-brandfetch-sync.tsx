'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  enrichReferencedCompaniesMissingBrandfetch,
  upgradeAllOrganizationBrandfetchLogosToDark,
} from '@/lib/references/library/sync-company-brandfetch'
import { resetAccountBrandfetchRetryCache } from '@/lib/accounts/account-brandfetch-retry-client'

const LOGO_DARK_UPGRADE_SESSION_KEY = 'refstack:org-logo-dark-upgrade-v2'

/**
 * Nachladen fehlender Logos/Branchen + einmaliges Org-weites theme/light → theme/dark.
 */
export function ReferencesOverviewBrandfetchSync({
  companyIds,
}: {
  companyIds: string[]
  /** @deprecated Ignoriert — Upgrade läuft org-weit. */
  companyIdsWithLogos?: string[]
}) {
  const router = useRouter()
  const started = useRef(false)

  useEffect(() => {
    const missingIds = [...new Set(companyIds.filter(Boolean))]
    if (started.current) return
    started.current = true

    resetAccountBrandfetchRetryCache()

    void (async () => {
      let shouldRefresh = false

      if (missingIds.length > 0) {
        const result = await enrichReferencedCompaniesMissingBrandfetch(missingIds)
        if (result.synced > 0) shouldRefresh = true
      }

      let alreadyDone = false
      try {
        alreadyDone = sessionStorage.getItem(LOGO_DARK_UPGRADE_SESSION_KEY) === '1'
      } catch {
        alreadyDone = false
      }

      if (!alreadyDone) {
        const upgrade = await upgradeAllOrganizationBrandfetchLogosToDark()
        try {
          sessionStorage.setItem(LOGO_DARK_UPGRADE_SESSION_KEY, '1')
        } catch {
          // ignore
        }
        if (upgrade.updated > 0) shouldRefresh = true
      }

      if (shouldRefresh) router.refresh()
    })()
  }, [companyIds, router])

  return null
}
