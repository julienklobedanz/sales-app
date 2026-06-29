import type { SupabaseClient } from '@supabase/supabase-js'

import { sendInternalApprovalReviewEmail } from '@/lib/references/internal-approval-email'

/** Benachrichtigt den am Account hinterlegten internen Referenzfreigabe-Kontakt (Metadaten → konkreter Mail-Hinweis). */
export async function notifyInternalReferenceCoordinatorAboutPendingReview(args: {
  supabase: SupabaseClient
  referenceId: string
  referenceTitle: string
  accountCompanyId: string
  accountCompanyName: string
  requesterName: string
  /** Aus dem Formular — hat Vorrang vor dem am Account hinterlegten Kontakt */
  accountManagerEmail?: string | null
  message?: string | null
}): Promise<void> {
  let email = String(args.accountManagerEmail ?? '').trim()
  let greeting = 'Hallo,'

  if (!email.toLowerCase().includes('@')) {
    const { data: companyRow } = await args.supabase
      .from('companies')
      .select('internal_reference_approval_contact_id')
      .eq('id', args.accountCompanyId)
      .maybeSingle()

    const contactId = (companyRow as { internal_reference_approval_contact_id?: string | null } | null)
      ?.internal_reference_approval_contact_id
    if (!contactId) return

    const { data: person } = await args.supabase
      .from('contact_persons')
      .select('email, first_name')
      .eq('id', contactId)
      .eq('company_id', args.accountCompanyId)
      .maybeSingle()

    email = String(person?.email ?? '').trim()
    if (person?.first_name) {
      greeting = `Hallo ${String(person.first_name).trim()},`
    }
  }

  if (!email.toLowerCase().includes('@')) return

  const { data: refTokenRow } = await args.supabase
    .from('references')
    .select('approval_internal_review_token')
    .eq('id', args.referenceId)
    .maybeSingle()
  const internalToken = (
    refTokenRow as { approval_internal_review_token?: string | null } | null
  )?.approval_internal_review_token
  if (!internalToken) return

  await sendInternalApprovalReviewEmail({
    to: email,
    greeting,
    referenceTitle: args.referenceTitle,
    accountCompanyName: args.accountCompanyName,
    requesterName: args.requesterName,
    message: args.message,
    internalReviewToken: internalToken,
    referenceId: args.referenceId,
  })
}
