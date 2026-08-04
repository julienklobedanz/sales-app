'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { completeClientApprovalWithAdmin } from '@/lib/references/complete-client-approval'
import type { CustomerApprovalScopeSelection } from '@/lib/references/customer-approval-scope'
import { formatApprovalGiverLine } from '@/lib/references/approval-workflow-display'
import { sendClientApprovalDelegationEmail } from '@/lib/references/client-approval-delegation-email'
import { log } from '@/lib/observability/logger'

export type CompleteClientApprovalResult =
  | { success: true; confirmationEmailSent?: boolean }
  | { success: false; error: string }

export async function completeClientApproval(params: {
  token: string
  decision: 'approved' | 'rejected' | 'changes_needed'
  comment?: string
  approvedQuote?: string
  consentFileUrl?: string
  referenceGiverName?: string
  referenceGiverTitle?: string
  scope?: CustomerApprovalScopeSelection
}): Promise<CompleteClientApprovalResult> {
  // Service-Role weil: Kunden-Freigabe per Token ohne Login; RLS blockiert anonyme Writes.
  // Grenze: completeClientApprovalWithAdmin filtert strikt auf approval_token.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return { success: false, error: 'server_config' }
  }

  return completeClientApprovalWithAdmin(admin, params)
}

export async function delegateClientApproval(params: {
  token: string
  delegateName?: string
  delegateEmail: string
}): Promise<CompleteClientApprovalResult> {
  const supabase = await createServerSupabaseClient()
  const token = params.token.trim()
  const email = params.delegateEmail.trim().toLowerCase()
  if (!email.includes('@')) return { success: false, error: 'Ungültige E-Mail.' }

  const { data: ref } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      organization_id,
      approval_token,
      approval_reference_giver_name,
      approval_reference_giver_title,
      approval_customer_facing_name,
      approval_coordinator_name,
      companies ( name )
    `
    )
    .eq('approval_token', token)
    .maybeSingle()

  if (!ref) return { success: false, error: 'Link ungültig.' }

  const refRow = ref as {
    id?: string
    title?: string | null
    organization_id?: string | null
    approval_token?: string | null
    approval_reference_giver_name?: string | null
    approval_reference_giver_title?: string | null
    approval_customer_facing_name?: string | null
    approval_coordinator_name?: string | null
    companies?: { name?: string } | { name?: string }[] | null
  }

  const previousContactName =
    formatApprovalGiverLine(
      refRow.approval_reference_giver_name,
      refRow.approval_reference_giver_title
    ) ?? 'Ihrem bisherigen Ansprechpartner'

  const company =
    Array.isArray(refRow.companies) && refRow.companies.length > 0
      ? refRow.companies[0]
      : (refRow.companies as { name?: string } | null)
  const companyName = company?.name?.trim() || 'Referenz'

  let vendorOrgName = companyName
  const orgId = String(refRow.organization_id ?? '').trim()
  if (orgId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    vendorOrgName = String(orgRow?.name ?? '').trim() || companyName
  }

  const { error } = await supabase
    .from('references')
    .update({
      approval_delegated_to_name: params.delegateName?.trim() || null,
      approval_delegated_to_email: email,
    })
    .eq('approval_token', token)
  if (error) return { success: false, error: error.message }

  if (refRow.id && refRow.organization_id) {
    // Service-Role weil: evidence_events-Insert ohne User-Session (delegierter Kunde).
    // Grenze: organization_id + reference_id aus token-validierter Referenzzeile.
    const admin = createServiceRoleSupabaseClient()
    if (admin) {
      const { error: eventError } = await admin.from('evidence_events').insert({
        organization_id: refRow.organization_id,
        reference_id: refRow.id,
        event_type: 'approval_delegated',
        payload: {
          delegate_name: params.delegateName?.trim() || null,
          delegate_email: email,
          from_giver: previousContactName,
        },
        created_by: null,
      })
      if (eventError) log.error('delegateClientApproval.eventLogFailed', { referenceId: refRow.id }, eventError)
    }
  }

  void sendClientApprovalDelegationEmail({
    to: email,
    delegateFirstName: params.delegateName,
    previousContactName,
    companyName,
    referenceTitle: String(refRow.title ?? 'Referenz'),
    approvalToken: token,
    customerFacingName: refRow.approval_customer_facing_name,
    coordinatorName: refRow.approval_coordinator_name,
    vendorOrgName,
  })

  return { success: true }
}
