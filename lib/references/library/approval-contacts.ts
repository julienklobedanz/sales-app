'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'
import { deriveReferenceGiverNameFromEmail } from '@/lib/references/derive-reference-giver-name-from-email'
import { log } from '@/lib/observability/logger'

export type ApprovalContactOption = {
  id: string
  email: string | null
  label: string
  kind: 'contact_person' | 'external_contact'
}

export async function getContactOptionsForReferenceImpl(
  referenceId: string
): Promise<{ contacts: ApprovalContactOption[]; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { contacts: [], error: 'Nicht angemeldet' }

  const { data: ref, error: refErr } = await supabase
    .from('references')
    .select('company_id')
    .eq('id', referenceId)
    .single()

  if (refErr || !ref?.company_id) {
    return { contacts: [], error: 'Referenz nicht gefunden' }
  }

  const { data: rows, error } = await supabase
    .from('contact_persons')
    .select('id, email, first_name, last_name')
    .eq('company_id', ref.company_id)
    .order('last_name', { ascending: true })

  if (error) {
    log.error('getContactOptionsForReference.failed', { referenceId }, error)
    return { contacts: [], error: 'Kontakte konnten nicht geladen werden' }
  }

  const { data: extRows, error: extErr } = await supabase
    .from('external_contacts')
    .select('id, email, first_name, last_name')
    .eq('company_id', ref.company_id)
    .order('last_name', { ascending: true })

  if (extErr) {
    log.warn('getContactOptionsForReference.externalFailed', { referenceId }, extErr)
  }

  const contacts: ApprovalContactOption[] = (rows ?? []).map((r) => {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
    const label = name ? `${name}${r.email ? ` (${r.email})` : ''}` : (r.email ?? '—')
    return {
      id: r.id,
      email: r.email,
      label: `${label} · intern`,
      kind: 'contact_person' as const,
    }
  })

  for (const r of extRows ?? []) {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
    const label = name ? `${name}${r.email ? ` (${r.email})` : ''}` : (r.email ?? '—')
    contacts.push({
      id: r.id,
      email: r.email,
      label: `${label} · Kundenkontakt`,
      kind: 'external_contact',
    })
  }

  contacts.sort((a, b) => a.label.localeCompare(b.label, 'de'))

  return { contacts }
}

/** E-Mail eingeben oder vorhandenen Kontakt wählen — legt bei Bedarf einen Kundenkontakt an. */
export async function ensureApprovalRecipientFromInputImpl(
  supabase: SupabaseClient,
  referenceId: string,
  rawInput: string
): Promise<
  | { contactId: string | null; externalContactId: string | null }
  | { error: string }
> {
  const input = rawInput.trim()
  if (!input) {
    return { error: 'Bitte E-Mail-Adresse eingeben oder einen Kontakt aus der Liste wählen.' }
  }

  if (!isApprovalRecipientEmail(input)) {
    return {
      error: 'Bitte eine gültige E-Mail-Adresse eingeben oder einen Vorschlag mit E-Mail auswählen.',
    }
  }

  const email = input.toLowerCase()

  const { data: ref, error: refErr } = await supabase
    .from('references')
    .select('company_id')
    .eq('id', referenceId)
    .single()

  if (refErr || !ref?.company_id) {
    return { error: 'Referenz nicht gefunden.' }
  }

  const companyId = ref.company_id as string

  const { data: company } = await supabase
    .from('companies')
    .select('organization_id')
    .eq('id', companyId)
    .maybeSingle()

  const organizationId = (company as { organization_id?: string | null } | null)?.organization_id
  if (!organizationId) {
    return { error: 'Unternehmen nicht gefunden.' }
  }

  const { data: existingExt } = await supabase
    .from('external_contacts')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', email)
    .maybeSingle()

  if (existingExt?.id) {
    return { contactId: null, externalContactId: existingExt.id as string }
  }

  const { data: existingPerson } = await supabase
    .from('contact_persons')
    .select('id, email')
    .eq('company_id', companyId)
    .ilike('email', email)
    .maybeSingle()

  if (existingPerson?.id) {
    return { contactId: existingPerson.id as string, externalContactId: null }
  }

  const derivedName = deriveReferenceGiverNameFromEmail(email)
  const nameParts = derivedName?.split(/\s+/).filter(Boolean) ?? []
  const localPart = email.split('@')[0]?.trim() || 'kontakt'
  const firstName = nameParts[0] ?? (localPart.slice(0, 80) || 'Kontakt')
  const lastName = nameParts.slice(1).join(' ') || 'Referenz'

  const { data: created, error: createErr } = await supabase
    .from('external_contacts')
    .insert({
      organization_id: organizationId,
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      email,
    })
    .select('id')
    .single()

  if (createErr || !created?.id) {
    return { error: createErr?.message ?? 'Kundenkontakt konnte nicht angelegt werden.' }
  }

  return { contactId: null, externalContactId: created.id as string }
}
