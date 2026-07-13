import type { NdaDisplayStatus } from '@/lib/accounts/company-entity'

import { NdaStatusBadge } from './nda-status-badge'

/** NDA nur bei aktivem oder auslaufendem NDA — kein „Kein NDA“ auf der Card. */
export function AccountCardNdaLine({ ndaStatus }: { ndaStatus: NdaDisplayStatus }) {
  if (ndaStatus === 'none') return null

  return (
    <div className="mt-px">
      <NdaStatusBadge status={ndaStatus} compact subtle />
    </div>
  )
}
