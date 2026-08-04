import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import {
  DEAL_DOCUMENTS_BUCKET,
  RFP_DOCUMENTS_BUCKET,
  uniqueStoragePaths,
} from '@/lib/deals/deal-delete-storage'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { normalizeDealStatus } from '@/lib/deals/normalize-deal-status'
import type { DealStatus } from './types'

async function getSessionOrgId(
  _supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<string | null> {
  const profile = await getRequestProfile()
  return profile?.organization_id ?? null
}

const CREATE_DEAL_ALLOWED_STATUS = new Set<DealStatus>(['negotiation', 'rfp'])

export async function createDealImpl(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const title = formData.get('title')?.toString()?.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const companyId = formData.get('company_id')?.toString()?.trim() || null
  if (!companyId) return { success: false, error: 'Account ist erforderlich.' }

  const { count: companyCount, error: companyCheckErr } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('id', companyId)
    .eq('organization_id', orgId)
  if (companyCheckErr || !companyCount) return { success: false, error: 'Ungültiger Account.' }

  const industry = formData.get('industry')?.toString()?.trim() || null
  const volume = formData.get('volume')?.toString()?.trim() || null
  if (!volume) return { success: false, error: 'Volumen ist erforderlich.' }
  const requirements_text = formData.get('requirements_text')?.toString()?.trim() || null
  const incumbent_provider = formData.get('incumbent_provider')?.toString()?.trim() || null
  const is_public = formData.get('is_public') !== 'false'
  const account_manager_id = formData.get('account_manager_id')?.toString() || null
  const sales_manager_id = formData.get('sales_manager_id')?.toString() || null
  const status = normalizeDealStatus(formData.get('status')?.toString() || 'negotiation')
  if (!CREATE_DEAL_ALLOWED_STATUS.has(status)) {
    return { success: false, error: 'Ungültige Phase für die Neuanlage.' }
  }
  const expiry_date = formData.get('expiry_date')?.toString()?.trim() || null

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: orgId,
      title,
      company_id: companyId,
      industry,
      volume,
      requirements_text,
      incumbent_provider: incumbent_provider || null,
      is_public,
      account_manager_id: account_manager_id || null,
      sales_manager_id: sales_manager_id || null,
      status,
      expiry_date: expiry_date || null,
      is_rfp_mode: status === 'rfp',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(deal.id))
  return { success: true, id: deal.id }
}

export async function updateDealImpl(args: {
  id: string
  title: string
  company_id: string | null
  industry: string | null
  volume: string | null
  status: DealStatus
  expiry_date: string | null
  is_public: boolean
  account_manager_id: string | null
  sales_manager_id: string | null
  requirements_text: string | null
  incumbent_provider: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const title = args.title.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const normalizedStatus = normalizeDealStatus(args.status)

  const { error } = await supabase
    .from('deals')
    .update({
      title,
      company_id: args.company_id,
      industry: args.industry,
      volume: args.volume,
      status: normalizedStatus,
      ...(normalizedStatus === 'rfp' ? { is_rfp_mode: true } : {}),
      expiry_date: args.expiry_date,
      is_public: args.is_public,
      account_manager_id: args.account_manager_id,
      sales_manager_id: args.sales_manager_id,
      requirements_text: args.requirements_text,
      incumbent_provider: args.incumbent_provider,
    })
    .eq('id', args.id)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(args.id))
  return { success: true }
}

/** Manuell RFP-Modus setzen (Promote/Demote). Nur explizite Nutzeraktion — nicht für stateless Coverage. */
export async function setDealRfpModeImpl(
  dealId: string,
  isRfpMode: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const orgId = await getSessionOrgId(supabase)
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { error } = await supabase
    .from('deals')
    .update({ is_rfp_mode: isRfpMode })
    .eq('id', dealId)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.deals.detail(dealId))
  return { success: true }
}

/** Deal inkl. Storage (deal-documents + legacy rfp-documents) und Desk-Projekte löschen. */
export async function deleteDealImpl(
  dealId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const user = await getRequestUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, sales_manager_id, account_manager_id')
    .eq('id', dealId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (dealErr || !deal) {
    return { success: false, error: 'Deal nicht gefunden.' }
  }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (
    !canManageDealDocuments(
      {
        sales_manager_id: deal.sales_manager_id ?? null,
        account_manager_id: deal.account_manager_id ?? null,
      },
      user.id,
      systemRole,
      functionRole
    )
  ) {
    return { success: false, error: 'Keine Berechtigung, diesen Deal zu löschen.' }
  }

  const { data: dealDocs } = await supabase
    .from('deal_documents')
    .select('storage_path')
    .eq('deal_id', dealId)
    .eq('organization_id', orgId)

  const dealDocPaths = uniqueStoragePaths((dealDocs ?? []).map((d) => d.storage_path))

  const { data: projects } = await supabase
    .from('deal_desk_projects')
    .select('id')
    .eq('deal_id', dealId)
    .eq('organization_id', orgId)

  const projectIds = (projects ?? []).map((p) => p.id)
  let rfpPaths: string[] = []
  if (projectIds.length > 0) {
    const { data: deskDocs } = await supabase
      .from('deal_desk_documents')
      .select('storage_path')
      .in('project_id', projectIds)
      .eq('organization_id', orgId)
    rfpPaths = uniqueStoragePaths((deskDocs ?? []).map((d) => d.storage_path))
  }

  if (dealDocPaths.length > 0) {
    const { error } = await supabase.storage.from(DEAL_DOCUMENTS_BUCKET).remove(dealDocPaths)
    if (error) return { success: false, error: error.message }
  }

  if (rfpPaths.length > 0) {
    const { error } = await supabase.storage.from(RFP_DOCUMENTS_BUCKET).remove(rfpPaths)
    if (error) return { success: false, error: error.message }
  }

  if (projectIds.length > 0) {
    const { error } = await supabase
      .from('deal_desk_projects')
      .delete()
      .eq('deal_id', dealId)
      .eq('organization_id', orgId)
    if (error) return { success: false, error: error.message }
  }

  const { error: deleteError } = await supabase
    .from('deals')
    .delete()
    .eq('id', dealId)
    .eq('organization_id', orgId)

  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath(ROUTES.deals.root)
  return { success: true }
}

export async function recordDealOutcomeImpl(args: {
  dealId: string
  outcome: 'won' | 'lost' | 'withdrawn'
  comment?: string
  /** `true`/`false`/`null` = gesetzt; weglassen = keine Angabe im Payload. */
  referenceHelpful?: boolean | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const status = normalizeDealStatus(args.outcome)

  const { error: updErr } = await supabase
    .from('deals')
    .update({ status })
    .eq('id', args.dealId)
    .eq('organization_id', orgId)
  if (updErr) return { success: false, error: updErr.message }

  const eventType =
    args.outcome === 'won'
      ? 'deal_won'
      : args.outcome === 'lost'
        ? 'deal_lost'
        : 'deal_withdrawn'

  const eventPayload: { comment: string | null; reference_helpful?: boolean | null } = {
    comment: args.comment?.trim() || null,
  }
  if (args.referenceHelpful !== undefined) {
    eventPayload.reference_helpful = args.referenceHelpful
  }

  const { error: evErr } = await supabase.from('evidence_events').insert({
    organization_id: orgId,
    deal_id: args.dealId,
    reference_id: null,
    event_type: eventType,
    payload: eventPayload,
    created_by: user.id,
  })
  if (evErr) return { success: false, error: evErr.message }

  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(args.dealId))
  return { success: true }
}
