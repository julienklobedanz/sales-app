import type { SupabaseClient } from '@supabase/supabase-js'

import type { SubmitForApprovalOptions } from '@/lib/references/library/approval-submit-types'
import type { ResolvedApprovalRecipient } from '@/lib/references/library/approvals-types'

export async function resolveContactForApproval(
  supabase: SupabaseClient,
  row: {
    contact_id: string | null
    customer_contact_id: string | null
    approval_contact_id?: string | null
    approval_external_contact_id?: string | null
  },
  companyId: string,
  options?: SubmitForApprovalOptions,
  resolveOpts?: { requireRecipientEmail?: boolean },
): Promise<ResolvedApprovalRecipient> {
  const requireEmail = resolveOpts?.requireRecipientEmail !== false
  const fromPerson = (
    c: { id: string; email?: string | null; first_name?: string | null } | null,
  ) => {
    const email = typeof c?.email === 'string' && c.email.includes('@') ? c.email : ''
    const firstName = typeof c?.first_name === 'string' ? c.first_name : ''
    return {
      email,
      firstName,
      approvalContactId: c?.id ?? null,
      approvalExternalContactId: null as string | null,
    }
  }

  const fromExternal = (
    c: { id: string; email?: string | null; first_name?: string | null } | null,
  ) => {
    const email = typeof c?.email === 'string' && c.email.includes('@') ? c.email : ''
    const firstName = typeof c?.first_name === 'string' ? c.first_name : ''
    return {
      email,
      firstName,
      approvalContactId: null as string | null,
      approvalExternalContactId: c?.id ?? null,
    }
  }

  if (options?.externalContactId) {
    const { data: c, error } = await supabase
      .from('external_contacts')
      .select('id, email, first_name')
      .eq('id', options.externalContactId)
      .eq('company_id', companyId)
      .single()
    if (error || !c) throw new Error('Ungültiger Kundenkontakt für dieses Unternehmen')
    const r = fromExternal(c)
    if (requireEmail && !r.email)
      throw new Error('Der gewählte Kundenkontakt hat keine gültige E-Mail-Adresse')
    return r
  }

  if (options?.contactId) {
    const { data: c, error } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', options.contactId)
      .eq('company_id', companyId)
      .single()
    if (error || !c) throw new Error('Ungültiger Kontakt für dieses Unternehmen')
    const r = fromPerson(c)
    if (requireEmail && !r.email)
      throw new Error('Der gewählte Kontakt hat keine gültige E-Mail-Adresse')
    return r
  }

  if (row.approval_contact_id) {
    const { data: c } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', row.approval_contact_id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (c?.id) {
      const r = fromPerson(c)
      if (r.email) return r
    }
  }

  if (row.approval_external_contact_id) {
    const { data: c } = await supabase
      .from('external_contacts')
      .select('id, email, first_name')
      .eq('id', row.approval_external_contact_id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (c?.id) {
      const r = fromExternal(c)
      if (r.email) return r
    }
  }

  const tryIds = [row.customer_contact_id, row.contact_id].filter(Boolean) as string[]
  for (const id of tryIds) {
    const { data: cp } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (cp?.id) {
      const r = fromPerson(cp)
      if (r.email) return r
    }
    const { data: ec } = await supabase
      .from('external_contacts')
      .select('id, email, first_name')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (ec?.id) {
      const r = fromExternal(ec)
      if (r.email) return r
    }
  }

  if (!requireEmail) {
    return {
      email: '',
      firstName: '',
      approvalContactId: null,
      approvalExternalContactId: null,
    }
  }

  throw new Error(
    'Kein Empfänger: Bitte in der Referenz einen Kundenkontakt mit gültiger E-Mail hinterlegen (oder im Account pflegen).',
  )
}
