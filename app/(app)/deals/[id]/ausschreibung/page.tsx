import { redirect } from 'next/navigation'

import { dealWorkspaceLandingHref } from '@/lib/deals/deal-workspace-href'

import { requireDealWorkspaceAccess } from './load-deal-workspace-context'

export default async function DealWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireDealWorkspaceAccess(id)
  redirect(dealWorkspaceLandingHref(id))
}
