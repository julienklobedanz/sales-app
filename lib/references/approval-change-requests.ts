import type { SupabaseClient } from '@supabase/supabase-js'

function payloadRecord(payload: unknown): Record<string, unknown> | null {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null
}

export type CustomerApprovalFollowUpUiState = {
  hasOpenChangeRequests: boolean
  canEditCustomerEmail: boolean
}

async function findLatestChangesNeededEvent(
  supabase: SupabaseClient,
  referenceId: string
): Promise<{ created_at: string } | null> {
  const { data: changeEvents } = await supabase
    .from('evidence_events')
    .select('created_at, payload')
    .eq('reference_id', referenceId)
    .eq('event_type', 'reference_approval_responded')
    .order('created_at', { ascending: false })
    .limit(5)

  const latestChanges = (changeEvents ?? []).find((row) => {
    const payload = payloadRecord(row.payload)
    return payload?.decision === 'changes_needed'
  })

  if (!latestChanges?.created_at) return null
  return { created_at: latestChanges.created_at }
}

async function hasAfterChangesFollowUp(
  supabase: SupabaseClient,
  referenceId: string,
  since: string
): Promise<boolean> {
  const { data: followUps } = await supabase
    .from('evidence_events')
    .select('payload')
    .eq('reference_id', referenceId)
    .eq('event_type', 'customer_approval_requested')
    .gt('created_at', since)

  return (followUps ?? []).some((row) => {
    const payload = payloadRecord(row.payload)
    return payload?.after_changes === true
  })
}

export async function resolveCustomerApprovalFollowUpUi(
  supabase: SupabaseClient,
  referenceId: string,
  customerApprovalStatus: string | null | undefined,
  approvalComment: string | null | undefined,
  options?: { showMagicLink?: boolean }
): Promise<CustomerApprovalFollowUpUiState> {
  const pending = String(customerApprovalStatus ?? '').toLowerCase() === 'pending'
  const comment = String(approvalComment ?? '').trim()
  const showMagicLink = options?.showMagicLink !== false

  if (!pending || !showMagicLink) {
    return { hasOpenChangeRequests: false, canEditCustomerEmail: false }
  }

  // Sichtbare Änderungswünsche im Freigabestatus = offen (auch nach erneuter Bearbeitung der Referenz).
  if (comment) {
    return { hasOpenChangeRequests: true, canEditCustomerEmail: true }
  }

  const latestChanges = await findLatestChangesNeededEvent(supabase, referenceId)
  if (!latestChanges) {
    return { hasOpenChangeRequests: false, canEditCustomerEmail: true }
  }

  const acknowledged = await hasAfterChangesFollowUp(
    supabase,
    referenceId,
    latestChanges.created_at
  )
  return {
    hasOpenChangeRequests: !acknowledged,
    canEditCustomerEmail: true,
  }
}

/** Offene Änderungswünsche: letzte Kundenantwort war „changes_needed“, noch keine „Freigabe erneut angefragt“ danach. */
export async function referenceHasOpenCustomerChangeRequests(
  supabase: SupabaseClient,
  referenceId: string,
  customerApprovalStatus: string | null | undefined,
  approvalComment?: string | null | undefined
): Promise<boolean> {
  const state = await resolveCustomerApprovalFollowUpUi(
    supabase,
    referenceId,
    customerApprovalStatus,
    approvalComment
  )
  return state.hasOpenChangeRequests
}
