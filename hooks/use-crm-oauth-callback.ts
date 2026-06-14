'use client'

import { useLayoutEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

type UseCrmOAuthCallbackOptions = {
  canConnectCrm: boolean
  hubspotConnected: boolean
  onOpenImport: () => void
}

/** Handles `crm_connected` / `crm_import` query params after HubSpot OAuth redirect. */
export function useCrmOAuthCallback({
  canConnectCrm,
  hubspotConnected,
  onOpenImport,
}: UseCrmOAuthCallbackOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useLayoutEffect(() => {
    const connected = searchParams.get('crm_connected')
    const provider = searchParams.get('crm_provider')
    const shouldImport = searchParams.get('crm_import') === '1'

    if (!connected && !shouldImport) return

    function cleanParams() {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('crm_connected')
      params.delete('crm_provider')
      params.delete('crm_import')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }

    if (shouldImport && canConnectCrm && hubspotConnected) {
      onOpenImport()
      cleanParams()
      return
    }

    if (connected === 'success' && provider === 'hubspot') {
      toast.success('HubSpot erfolgreich verbunden.')
      if (shouldImport && canConnectCrm) {
        onOpenImport()
      }
      cleanParams()
      return
    }

    if (connected === 'error' && provider === 'hubspot') {
      toast.error('HubSpot-Verbindung fehlgeschlagen.')
      cleanParams()
    }
  }, [searchParams, pathname, router, canConnectCrm, hubspotConnected, onOpenImport])
}
