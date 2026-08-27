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

function revalidateAfterEligibilityChange(dealId: string) {
  revalidateDealWorkspacePaths(dealId, 'eignung')
  revalidatePath(ROUTES.compliance.root, 'page')
}

async function assertCriterionOnDeal(
  auth: Extract<LinkAuth, { orgId: string }>,
  dealId: string,
  criterionId: string,
): Promise<{ success: true; dimension: string } | { error: string }> {
  const { data, error } = await auth.supabase
    .from('deal_rfp_eligibility_criteria')
    .select('id, dimension')
    .eq('id', criterionId)
    .eq('deal_id', dealId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !data) return { error: 'Kriterium nicht gefunden.' }
  return { success: true, dimension: data.dimension }
}

export type DealEligibilityCriterionActionResult =
  | { success: true }
  | { success: false; error: string }

export async function linkDealEligibilityCriterionDocument(params: {
  dealId: string
  criterionId: string
  documentId: string
}): Promise<DealEligibilityCriterionActionResult> {
  const auth = await getLinkAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const dealId = params.dealId.trim()
  const criterionId = params.criterionId.trim()
  const documentId = params.documentId.trim()
  if (!dealId || !criterionId || !documentId) {
    return { success: false, error: 'Ungültige Parameter.' }
  }

  const dealRes = await loadDealForLink(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const criterion = await assertCriterionOnDeal(auth, dealId, criterionId)
  if ('error' in criterion) return { success: false, error: criterion.error }

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
    .from('deal_rfp_eligibility_criterion_documents')
    .insert({
      criterion_id: criterionId,
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

  const { error: clearError } = await auth.supabase
    .from('deal_rfp_eligibility_criteria')
    .update({
      no_matching_evidence_at: null,
      no_matching_evidence_by: null,
    })
    .eq('id', criterionId)
    .eq('organization_id', auth.orgId)

  if (clearError) return { success: false, error: clearError.message }

  revalidateAfterEligibilityChange(dealId)
  return { success: true }
}

export async function confirmDealEligibilityNoMatchingEvidence(params: {
  dealId: string
  criterionId: string
}): Promise<DealEligibilityCriterionActionResult> {
  const auth = await getLinkAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const dealId = params.dealId.trim()
  const criterionId = params.criterionId.trim()
  if (!dealId || !criterionId) {
    return { success: false, error: 'Ungültige Parameter.' }
  }

  const dealRes = await loadDealForLink(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const criterion = await assertCriterionOnDeal(auth, dealId, criterionId)
  if ('error' in criterion) return { success: false, error: criterion.error }
  if (criterion.dimension !== 'certification') {
    return {
      success: false,
      error: 'Nur Zertifikatskriterien können so markiert werden.',
    }
  }

  const { error } = await auth.supabase
    .from('deal_rfp_eligibility_criteria')
    .update({
      no_matching_evidence_at: new Date().toISOString(),
      no_matching_evidence_by: auth.userId,
    })
    .eq('id', criterionId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidateAfterEligibilityChange(dealId)
  return { success: true }
}
