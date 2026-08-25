'use server'

import { revalidatePath } from 'next/cache'

import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { revalidateDealWorkspacePaths } from '@/lib/deals/revalidate-deal-workspace-paths'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type LinkAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      orgId: string
      userId: string
      systemRole: ReturnType<typeof parseProfileRoles>['systemRole']
      functionRole: ReturnType<typeof parseProfileRoles>['functionRole']
    }

type DealAccessRow = {
  id: string
  organization_id: string
  sales_manager_id: string | null
  account_manager_id: string | null
}

async function getLinkAuth(): Promise<LinkAuth> {
  const user = await getRequestUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const profile = await getRequestProfile()
  if (!profile?.organization_id) return { error: 'Onboarding unvollständig.' }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const supabase = await createServerSupabaseClient()

  return {
    supabase,
    orgId: profile.organization_id,
    userId: user.id,
    systemRole,
    functionRole,
  }
}

async function loadDealForLink(
  auth: Extract<LinkAuth, { orgId: string }>,
  dealId: string,
): Promise<{ deal: DealAccessRow } | { error: string }> {
  const { data: deal, error } = await auth.supabase
    .from('deals')
    .select('id, organization_id, sales_manager_id, account_manager_id')
    .eq('id', dealId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !deal) return { error: 'Deal nicht gefunden.' }
  return { deal: deal as DealAccessRow }
}

function assertCanManageDeal(
  auth: Extract<LinkAuth, { userId: string }>,
  deal: DealAccessRow,
): { success: true } | { error: string } {
  if (!canManageDealDocuments(deal, auth.userId, auth.systemRole, auth.functionRole)) {
    return { error: 'Keine Berechtigung, diesen Deal zu bearbeiten.' }
  }
  return { success: true }
}

function revalidateAfterLink(dealId: string) {
  revalidateDealWorkspacePaths(dealId, 'anforderungen')
  revalidatePath(ROUTES.compliance.root, 'page')
}

async function assertRequirementOnDeal(
  auth: Extract<LinkAuth, { orgId: string }>,
  dealId: string,
  requirementId: string,
): Promise<{ success: true } | { error: string }> {
  const { data, error } = await auth.supabase
    .from('deal_rfp_requirements')
    .select('id')
    .eq('id', requirementId)
    .eq('deal_id', dealId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !data) return { error: 'Anforderung nicht gefunden.' }
  return { success: true }
}

export type DealRequirementDocumentActionResult =
  | { success: true }
  | { success: false; error: string }

export async function linkDealRequirementDocument(params: {
  dealId: string
  requirementId: string
  documentId: string
}): Promise<DealRequirementDocumentActionResult> {
  const auth = await getLinkAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const dealId = params.dealId.trim()
  const requirementId = params.requirementId.trim()
  const documentId = params.documentId.trim()
  if (!dealId || !requirementId || !documentId) {
    return { success: false, error: 'Ungültige Parameter.' }
  }

  const dealRes = await loadDealForLink(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const requirement = await assertRequirementOnDeal(auth, dealId, requirementId)
  if ('error' in requirement) return { success: false, error: requirement.error }

  const { data: document, error: documentError } = await auth.supabase
    .from('organization_compliance_documents')
    .select('id')
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (documentError || !document) {
    return { success: false, error: 'Nachweis nicht gefunden.' }
  }

  const { error: insertError } = await auth.supabase
    .from('deal_rfp_requirement_documents')
    .insert({
      requirement_id: requirementId,
      document_id: documentId,
      organization_id: auth.orgId,
      linked_by: auth.userId,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: 'Dieser Nachweis ist bereits verknüpft.' }
    }
    return { success: false, error: insertError.message }
  }

  revalidateAfterLink(dealId)
  return { success: true }
}

export async function unlinkDealRequirementDocument(params: {
  dealId: string
  requirementId: string
  documentId: string
}): Promise<DealRequirementDocumentActionResult> {
  const auth = await getLinkAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const dealId = params.dealId.trim()
  const requirementId = params.requirementId.trim()
  const documentId = params.documentId.trim()
  if (!dealId || !requirementId || !documentId) {
    return { success: false, error: 'Ungültige Parameter.' }
  }

  const dealRes = await loadDealForLink(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const requirement = await assertRequirementOnDeal(auth, dealId, requirementId)
  if ('error' in requirement) return { success: false, error: requirement.error }

  const { error: deleteError } = await auth.supabase
    .from('deal_rfp_requirement_documents')
    .delete()
    .eq('requirement_id', requirementId)
    .eq('document_id', documentId)
    .eq('organization_id', auth.orgId)

  if (deleteError) return { success: false, error: deleteError.message }

  revalidateAfterLink(dealId)
  return { success: true }
}
