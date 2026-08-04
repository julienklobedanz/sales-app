import type { SupabaseClient } from '@supabase/supabase-js'

export type CustomerApprovalRecipientRow = {
  approval_contact_id: string | null
  approval_external_contact_id: string | null
  approval_delegated_to_email: string | null
  approval_delegated_to_name: string | null
}

export async function resolveCustomerApprovalRecipient(
  admin: SupabaseClient,
  ref: CustomerApprovalRecipientRow,
): Promise<{ email: string; firstName: string } | null> {
  const delegatedEmail =
    typeof ref.approval_delegated_to_email === 'string'
      ? ref.approval_delegated_to_email.trim()
      : ''
  if (delegatedEmail.includes('@')) {
    const name =
      typeof ref.approval_delegated_to_name === 'string'
        ? ref.approval_delegated_to_name.trim()
        : ''
    return { email: delegatedEmail, firstName: name }
  }

  if (ref.approval_external_contact_id) {
    const { data } = await admin
      .from('external_contacts')
      .select('email, first_name')
      .eq('id', ref.approval_external_contact_id)
      .maybeSingle()
    const email = typeof data?.email === 'string' ? data.email.trim() : ''
    if (email.includes('@')) {
      const firstName = typeof data?.first_name === 'string' ? data.first_name.trim() : ''
      return { email, firstName }
    }
  }

  if (ref.approval_contact_id) {
    const { data } = await admin
      .from('contact_persons')
      .select('email, first_name')
      .eq('id', ref.approval_contact_id)
      .maybeSingle()
    const email = typeof data?.email === 'string' ? data.email.trim() : ''
    if (email.includes('@')) {
      const firstName = typeof data?.first_name === 'string' ? data.first_name.trim() : ''
      return { email, firstName }
    }
  }

  return null
}

export async function fetchVendorOrganizationName(
  admin: SupabaseClient,
  organizationId: string | null | undefined,
): Promise<string> {
  const orgId = String(organizationId ?? '').trim()
  if (!orgId) return 'Refstack'
  const { data } = await admin
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle()
  const name = String(data?.name ?? '').trim()
  return name || 'Refstack'
}
