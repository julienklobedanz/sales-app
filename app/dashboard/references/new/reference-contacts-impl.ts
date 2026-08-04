import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { REVALIDATE, ROUTES } from '@/lib/routes'
import type { ExternalContact } from './reference-new-action-types'

export async function createContactImpl(formData: FormData) {
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

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const email = formData.get('email')?.toString()?.trim()

  if (!firstName || !lastName || !email) {
    return { success: false, error: 'Alle Felder sind erforderlich.' }
  }

  const normalizedEmail = email.toLowerCase()
  const { data: existing } = await supabase
    .from('contact_persons')
    .select('id, first_name, last_name, email')
    .eq('organization_id', organizationId)
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { success: true, contact: existing }
  }

  const { data, error } = await supabase
    .from('contact_persons')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      organization_id: organizationId,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')

  return { success: true, contact: data }
}

export async function createExternalContactImpl(
  formData: FormData,
): Promise<
  { success: false; error: string } | { success: true; contact: ExternalContact }
> {
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

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const companyId = formData.get('companyId')?.toString()?.trim()
  if (!companyId) {
    return { success: false, error: 'Bitte zuerst ein Unternehmen auswählen.' }
  }

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const email = formData.get('email')?.toString()?.trim()
  const role = formData.get('role')?.toString()?.trim() || null
  const phone = formData.get('phone')?.toString()?.trim() || null

  if (!firstName || !lastName || !email) {
    return { success: false, error: 'Vorname, Nachname und E-Mail sind erforderlich.' }
  }

  const { data, error } = await supabase
    .from('external_contacts')
    .insert({
      organization_id: organizationId,
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      phone,
    })
    .select('id, company_id, first_name, last_name, email, role, phone')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')

  return {
    success: true,
    contact: {
      id: data.id,
      company_id: data.company_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      role: data.role,
      phone: data.phone ?? null,
    },
  }
}

export async function updateContactImpl(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const firstName = formData.get('firstName')?.toString()?.trim() ?? ''
  const lastName = formData.get('lastName')?.toString()?.trim() ?? ''
  const email = formData.get('email')?.toString()?.trim() ?? ''
  const phone = formData.get('phone')?.toString()?.trim() ?? ''

  const { error } = await supabase
    .from('contact_persons')
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')
  return { success: true }
}

export async function updateExternalContactImpl(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const firstName = formData.get('firstName')?.toString()?.trim() ?? ''
  const lastName = formData.get('lastName')?.toString()?.trim() ?? ''
  const email = formData.get('email')?.toString()?.trim() ?? ''
  const role = formData.get('role')?.toString()?.trim() ?? ''
  const phone = formData.get('phone')?.toString()?.trim() ?? ''

  const { error } = await supabase
    .from('external_contacts')
    .update({
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      role: role || undefined,
      phone: phone || undefined,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.references.new)
  revalidatePath(REVALIDATE.referenceEditPage, 'page')
  return { success: true }
}
