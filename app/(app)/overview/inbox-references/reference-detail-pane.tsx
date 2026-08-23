'use client'

import { ReferenceInternalFrame } from '@/components/references/reference-internal-frame'
import type { ReferenceAssetRow } from '@/app/(app)/actions'
import type { OrgDateDisplayFormat } from '@/lib/format'
import type { ReferenceInternalFrameSupplement } from '@/lib/references/reference-internal-frame-supplement'

import type { ConceptReferenceRow } from './types'

export function ReferenceDetailPane({
  selectedRef,
  supplement,
  supplementReady,
  canEdit,
  canDelete,
  isSalesView,
  orgDateFmt,
  autoOpenApprovalDialog,
  arrivedWithId,
  firstSelectedId,
  hasLeftInitialSelection,
  externalContacts,
  assets,
  assetsLoading,
  onAssetsChange,
}: {
  selectedRef: ConceptReferenceRow | null
  supplement: ReferenceInternalFrameSupplement | null
  supplementReady: boolean
  canEdit: boolean
  canDelete: boolean
  isSalesView: boolean
  orgDateFmt: OrgDateDisplayFormat
  autoOpenApprovalDialog: boolean
  arrivedWithId: boolean
  firstSelectedId: string | null
  hasLeftInitialSelection: boolean
  externalContacts: {
    id: string
    company_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    phone?: string | null
  }[]
  assets: ReferenceAssetRow[]
  assetsLoading: boolean
  onAssetsChange?: (assets: ReferenceAssetRow[]) => void
}) {
  return (
    <ReferenceInternalFrame
      host="library-pane"
      row={selectedRef}
      supplement={supplement}
      supplementReady={supplementReady}
      assets={assets}
      assetsLoading={assetsLoading}
      onAssetsChange={onAssetsChange}
      externalContacts={externalContacts}
      canEdit={canEdit}
      canDelete={canDelete}
      isSalesView={isSalesView}
      orgDateFmt={orgDateFmt}
      autoOpenApprovalDialog={autoOpenApprovalDialog}
      arrivedWithId={arrivedWithId}
      firstSelectedId={firstSelectedId}
      hasLeftInitialSelection={hasLeftInitialSelection}
    />
  )
}
