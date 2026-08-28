'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { canManageTenderDocuments } from '@/lib/deals/can-manage-deal-documents'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import {
  assignDealToExistingTender,
  createTenderAndAssignDeal,
  detachDealFromTender,
} from '@/lib/tenders/assign-deal'
import { listOrgTenderOptions } from '@/lib/tenders/list-org-tender-options'
import {
  updateTenderStammdaten,
  type UpdateTenderStammdatenInput,
} from '@/lib/tenders/update-tender'

async function requireOrgId(): Promise<
  { ok: true; orgId: string } | { ok: false; error: string }
> {
  const user = await getRequestUser()
  if (!user) return { ok: false, error: 'Nicht angemeldet.' }
  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) return { ok: false, error: 'Keine Organisation zugeordnet.' }
  return { ok: true, orgId }
}

export async function listTendersForAssignAction() {
  return listOrgTenderOptions()
}

export async function assignDealToTenderAction(args: {
  dealId: string
  mode: 'existing' | 'create'
  tenderId?: string
  title?: string
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireOrgId()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createServerSupabaseClient()
  if (args.mode === 'existing') {
    const tenderId = args.tenderId?.trim()
    if (!tenderId) return { success: false, error: 'Ausschreibung wählen.' }
    return assignDealToExistingTender(supabase, {
      organizationId: auth.orgId,
      dealId: args.dealId,
      tenderId,
    })
  }

  const title = args.title?.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }
  return createTenderAndAssignDeal(supabase, {
    organizationId: auth.orgId,
    dealId: args.dealId,
    title,
  })
}

export async function detachDealFromTenderAction(args: {
  dealId: string
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireOrgId()
  if (!auth.ok) return { success: false, error: auth.error }

  const supabase = await createServerSupabaseClient()
  return detachDealFromTender(supabase, {
    organizationId: auth.orgId,
    dealId: args.dealId,
  })
}

export async function updateTenderStammdatenAction(
  args: { tenderId: string } & UpdateTenderStammdatenInput,
): Promise<{ success: boolean; error?: string }> {
  const user = await getRequestUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const supabase = await createServerSupabaseClient()

  const { data: tender } = await supabase
    .from('tenders')
    .select('id')
    .eq('id', args.tenderId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!tender) return { success: false, error: 'Ausschreibung nicht gefunden.' }

  const { data: lots } = await supabase
    .from('deals')
    .select('sales_manager_id, account_manager_id')
    .eq('tender_id', args.tenderId)
    .eq('organization_id', orgId)
  if (!canManageTenderDocuments(lots ?? [], user.id, systemRole, functionRole)) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  const { tenderId, ...fields } = args
  return updateTenderStammdaten(supabase, {
    organizationId: orgId,
    tenderId,
    fields,
  })
}
