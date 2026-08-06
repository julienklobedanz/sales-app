import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asTableInsert, asTableUpdate, type Tables } from '@/lib/supabase/db-types'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'
import type { ContactPersonRow, StakeholderRole } from './account-action-types'

function toContactPersonRow(row: Tables<'contact_persons'>): ContactPersonRow {
  return {
    id: row.id,
    company_id: row.company_id ?? '',
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    linkedin_url: row.linkedin_url,
    role: row.role,
    position: row.position,
    avatar_url: row.avatar_url,
    last_interaction_at: row.last_interaction_at,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at,
  }
}

export async function updateExternalContactBuyingCenterRoleImpl(
  id: string,
  role: StakeholderRole,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('external_contacts')
    .select('company_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('external_contacts')
    .update({ buying_center_role: role, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    const msg = error.message ?? ''
    if (/buying_center_role/i.test(msg)) {
      return {
        success: false,
        error:
          'Buying-Center-Rolle für Referenz-Kontakte ist in der Datenbank noch nicht verfügbar. Bitte Migration ausführen.',
      }
    }
    return { success: false, error: msg }
  }

  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id as string))
  return { success: true }
}

export async function getContactsByCompanyIdImpl(
  companyId: string,
): Promise<ContactPersonRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('contact_persons')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  if (error && (error.message ?? '').includes('company_id')) {
    // DB noch ohne company_id-Spalte → keine Kontakte im Account-Detail anzeigen
    return []
  }
  return (data ?? []).map(toContactPersonRow)
}

/** Ein interner Kontakt pro Account als Ansprechpartner für Koordination der Referenzfreigabe (Kunde). */
export async function setCompanyInternalReferenceApprovalContactImpl(
  companyId: string,
  contactPersonId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id)
    return { success: false, error: 'Onboarding unvollständig.' }
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (profileIsSalesRestricted(systemRole, functionRole))
    return { success: false, error: 'Keine Berechtigung.' }

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .select('id, organization_id')
    .eq('id', companyId)
    .single()
  if (cErr || !company) return { success: false, error: 'Account nicht gefunden.' }
  if (company.organization_id !== profile.organization_id) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  if (contactPersonId) {
    const { data: cp, error: cpErr } = await supabase
      .from('contact_persons')
      .select('id, company_id')
      .eq('id', contactPersonId)
      .single()
    if (cpErr || !cp) return { success: false, error: 'Kontakt nicht gefunden.' }
    if (cp.company_id !== companyId) {
      return { success: false, error: 'Kontakt gehört nicht zu diesem Account.' }
    }
  }

  const { error } = await supabase
    .from('companies')
    .update({ internal_reference_approval_contact_id: contactPersonId })
    .eq('id', companyId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    if ((error.message ?? '').toLowerCase().includes('internal_reference_approval')) {
      return {
        success: false,
        error:
          'Spalte internal_reference_approval_contact_id fehlt. Bitte Migration ausführen und Schema aktualisieren.',
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function createContactPersonImpl(
  companyId: string,
  payload: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    role?: string | null
    position?: string | null
    last_interaction_at?: string | null
  },
): Promise<{ success: boolean; contact?: ContactPersonRow; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  // Einige Deployments verlangen organization_id auf contact_persons.
  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase.from('companies').select('organization_id').eq('id', companyId).single(),
    supabase.from('profiles').select('organization_id').eq('id', user.id).single(),
  ])
  const organization_id =
    company?.organization_id ?? profile?.organization_id ?? null

  const insertRow: Record<string, unknown> = {
    company_id: companyId,
    first_name: payload.first_name?.trim() || null,
    last_name: payload.last_name?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    phone: payload.phone?.trim() || null,
    linkedin_url: payload.linkedin_url?.trim() || null,
    role: payload.role?.trim() || null,
    position: payload.position?.trim() || null,
    last_interaction_at: payload.last_interaction_at || null,
  }
  if (organization_id) insertRow.organization_id = organization_id

  const { data, error } = await supabase
    .from('contact_persons')
    .insert(asTableInsert<'contact_persons'>(insertRow))
    .select('*')
    .single()
  if (error) {
    if ((error.message ?? '').includes('company_id')) {
      return {
        success: false,
        error:
          "Kontakte können noch nicht einem Account zugeordnet werden, weil die Spalte 'contact_persons.company_id' in deiner DB fehlt. Bitte Migration ausführen und Schema-Cache refreshen.",
      }
    }
    return { success: false, error: error.message }
  }
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true, contact: data ? toContactPersonRow(data) : undefined }
}

export async function updateContactPersonImpl(
  id: string,
  payload: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    role?: string | null
    position?: string | null
    company_id?: string | null
    last_interaction_at?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('contact_persons')
    .select('company_id')
    .eq('id', id)
    .single()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.first_name !== undefined)
    update.first_name = payload.first_name?.trim() || null
  if (payload.last_name !== undefined)
    update.last_name = payload.last_name?.trim() || null
  if (payload.email !== undefined)
    update.email = payload.email?.trim().toLowerCase() || null
  if (payload.phone !== undefined) update.phone = payload.phone?.trim() || null
  if (payload.linkedin_url !== undefined)
    update.linkedin_url = payload.linkedin_url?.trim() || null
  if (payload.role !== undefined) update.role = payload.role?.trim() || null
  if (payload.position !== undefined) update.position = payload.position?.trim() || null
  if (payload.company_id !== undefined) update.company_id = payload.company_id || null
  if (payload.last_interaction_at !== undefined)
    update.last_interaction_at = payload.last_interaction_at || null
  const { error } = await supabase
    .from('contact_persons')
    .update(asTableUpdate<'contact_persons'>(update))
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}

export async function deleteContactPersonImpl(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('contact_persons')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('contact_persons').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}
