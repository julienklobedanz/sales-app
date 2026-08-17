'use client'

import { useEffect } from 'react'
import { logReferenceViewed } from './actions'

const storageKey = (referenceId: string) => `refstack:reference_viewed:${referenceId}`

/**
 * Ein `reference_viewed` pro Browser-Tab-Session und Referenz (kein Doppelzähler bei
 * React Strict Mode oder Reload).
 */
export function ReferenceViewedTracker({
  referenceId,
  enabled = true,
}: {
  referenceId: string
  enabled?: boolean
}) {
  useEffect(() => {
    if (!enabled) return
    try {
      const key = storageKey(referenceId)
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1')
    } catch {
      // sessionStorage nicht verfügbar
    }
    void logReferenceViewed(referenceId)
  }, [referenceId, enabled])

  return null
}
