import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'
import { COPY } from '@/lib/copy'
import { resolveDealWorkspaceAccess } from '@/lib/deals/deal-workspace-href'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

import { getDealWithReferences } from '../../actions'
import { listDealDocuments } from '../../document-actions'
import { DealRfpCockpitBlock } from '../../cockpit/deal-rfp-cockpit-block'
import { DealRfpCockpitSkeleton } from '../../cockpit/deal-rfp-cockpit-skeleton'
import { DealRfpHashBridge } from '../../cockpit/deal-rfp-hash-bridge'

export default function DealWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealWorkspacePageContent params={params} />
    </Suspense>
  )
}

async function DealWorkspacePageContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id ?? null
  if (!orgId) redirect(ROUTES.onboarding)

  const deal = await getDealWithReferences(id)
  const access = resolveDealWorkspaceAccess(deal)
  if (access.kind === 'not-found') notFound()
  if (access.kind === 'redirect-deal') redirect(access.href)
  if (!deal) notFound()

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
  const documentsResult = await listDealDocuments(id)
  const documents = documentsResult.success ? documentsResult.rows : []

  return (
    <div>
      <DealRfpHashBridge dealId={id} isRfpDeal surface="workspace" />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={ROUTES.deals.root} className="hover:underline">
          Deals
        </Link>
        <span className="px-2">/</span>
        <Link href={ROUTES.deals.detail(id)} className="hover:underline">
          {deal.title}
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{COPY.deals.cockpit.rfpBlockTitle}</span>
      </nav>
      <Suspense fallback={<DealRfpCockpitSkeleton />}>
        <DealRfpCockpitBlock
          dealId={id}
          orgId={orgId}
          deal={deal}
          documents={documents}
          canManageDocuments={canManageDocuments}
          dealContext={{
            title: deal.title,
            industry: deal.industry,
            volume: deal.volume,
          }}
        />
      </Suspense>
    </div>
  )
}
