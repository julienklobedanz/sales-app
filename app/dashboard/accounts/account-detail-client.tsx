'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { ACCOUNT_DETAIL_SURFACES } from '@/lib/accounts/account-detail-surfaces'
import { useRole } from '@/hooks/useRole'

import { AccountDetailHeader } from './account-detail-header'
import { AccountDetailPipelineTab } from './account-detail-pipeline-tab'
import { AccountDetailProofPointsTab } from './account-detail-proof-points-tab'
import type { AccountDetailClientProps } from './account-detail-types'
import { EditAccountDialog } from './edit-account-dialog'

export function AccountDetailClient({
  company,
  references,
  activeDeals,
  hubspotPortalId = null,
  initialEditOpen,
  ndaAgreements,
}: AccountDetailClientProps) {
  const { isAdmin, isAccountManager } = useRole()
  const searchParams = useSearchParams()
  const canEditAccount = isAdmin || isAccountManager
  const [editAccountOpen, setEditAccountOpen] = useState(Boolean(initialEditOpen))

  return (
    <div className="space-y-6">
      <AccountDetailHeader
        company={company}
        canEdit={canEditAccount}
        onEditClick={() => setEditAccountOpen(true)}
        ndaAgreements={ndaAgreements}
        openNdaOnMount={searchParams.get('openNda') === '1'}
      />

      <EditAccountDialog
        open={editAccountOpen}
        onOpenChange={setEditAccountOpen}
        company={company}
      />

      {ACCOUNT_DETAIL_SURFACES.map((surface) => {
        if (surface === 'header' || surface === 'nda') return null
        if (surface === 'pipeline') {
          return (
            <AccountDetailPipelineTab
              key={surface}
              activeDeals={activeDeals}
              hubspotPortalId={hubspotPortalId}
            />
          )
        }
        if (surface === 'proof_points') {
          return (
            <AccountDetailProofPointsTab
              key={surface}
              company={company}
              references={references}
            />
          )
        }
        return null
      })}
    </div>
  )
}
