'use client'

import type { ResolvedCompanyForImport } from '@/lib/accounts/resolve-company-for-import'

type RetryState = 'idle' | 'loading' | 'done'

const retryByKey = new Map<string, RetryState>()
const inFlight = new Map<string, Promise<BrandfetchLogoRetryResult | null>>()

/** Neuer Seitenaufruf: erneuter Brandfetch-Versuch erlauben. */
export function resetCompanyBrandfetchRetryCache(): void {
  retryByKey.clear()
  inFlight.clear()
}

function retryKey(companyId: string, failedLogoUrl: string | null | undefined) {
  return `${companyId}:${failedLogoUrl?.trim() || '__missing__'}`
}

export type BrandfetchLogoRetryResult = {
  logo_url: string | null
  industry: string | null
  headquarters: string | null
  employee_count: number | null
  website_url: string | null
  companyName: string
}

export function requestCompanyBrandfetchRetry(
  companyId: string,
  failedLogoUrl: string | null | undefined,
  fetcher: (companyId: string, failedLogoUrl: string | null) => Promise<{
    success: boolean
    company?: ResolvedCompanyForImport
  }>
): Promise<BrandfetchLogoRetryResult | null> {
  const id = companyId.trim()
  if (!id) return Promise.resolve(null)

  const key = retryKey(id, failedLogoUrl)
  const state = retryByKey.get(key)
  if (state === 'loading') {
    return inFlight.get(key) ?? Promise.resolve(null)
  }
  if (state === 'done') return Promise.resolve(null)

  retryByKey.set(key, 'loading')

  const promise = fetcher(id, failedLogoUrl?.trim() || null)
    .then((res) => {
      retryByKey.set(key, 'done')
      if (!res.success || !res.company) return null
      const c = res.company
      return {
        logo_url: c.logo_url,
        industry: c.industry,
        headquarters: c.headquarters,
        employee_count: c.employee_count,
        website_url: c.website_url,
        companyName: c.companyName,
      } satisfies BrandfetchLogoRetryResult
    })
    .catch(() => {
      retryByKey.set(key, 'done')
      return null
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, promise)
  return promise
}
