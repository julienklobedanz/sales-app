import { notFound, redirect } from 'next/navigation'

import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'
import { resolveDealWorkspaceAccess } from '@/lib/deals/deal-workspace-href'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { mergeLotAndTenderDocuments } from '@/lib/deals/document-display'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import type { DealWithReferences } from '../../types'

import { getDealWithReferences } from '../../actions'
import { listDealDocuments, listTenderDocuments } from '../../document-actions'
import type { DealDocumentRow } from '../../document-actions'

export type DealWorkspaceContext = {
  orgId: string
  deal: DealWithReferences
  canManageDocuments: boolean
  documents: DealDocumentRow[]
}

async function requireDealWorkspaceDeal(dealId: string) {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id ?? null
  if (!orgId) redirect(ROUTES.onboarding)

  const deal = await getDealWithReferences(dealId)
  const access = resolveDealWorkspaceAccess(deal)
  if (access.kind === 'not-found') notFound()
  if (access.kind === 'redirect-deal') redirect(access.href)
  if (!deal) notFound()

  return { user, profile, orgId, deal }
}

export async function requireDealWorkspaceAccess(dealId: string) {
  await requireDealWorkspaceDeal(dealId)
}

export async function loadDealWorkspaceContext(
  dealId: string,
): Promise<DealWorkspaceContext> {
  const { user, profile, orgId, deal } = await requireDealWorkspaceDeal(dealId)

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const canManageDocuments = canManageDealDocuments(
    {
      sales_manager_id: deal.sales_manager_id,
      account_manager_id: deal.account_manager_id,
    },
    user.id,
    systemRole,
    functionRole,
  )
  const [documentsResult, tenderDocumentsResult] = await Promise.all([
    listDealDocuments(dealId),
    deal.tender_id
      ? listTenderDocuments(deal.tender_id)
      : Promise.resolve({ success: true as const, rows: [] }),
  ])
  const documents = mergeLotAndTenderDocuments(
    documentsResult.success ? documentsResult.rows : [],
    tenderDocumentsResult.success ? tenderDocumentsResult.rows : [],
  )

  return { orgId, deal, canManageDocuments, documents }
}
