import type { SupabaseClient } from '@supabase/supabase-js'

import { getPortfolioManageAndPreviewUrlsForApprovalEmail } from '@/lib/evidence/sharing'
import {
  fetchVendorOrganizationName,
  resolveCustomerApprovalRecipient,
  type CustomerApprovalRecipientRow,
} from '@/lib/references/customer-approval-recipient'
import { sendCustomerSperrlinkEmail } from '@/lib/references/customer-sperrlink-email'

export async function sendClientApprovalConfirmationEmail(args: {
  admin: SupabaseClient
  referenceId: string
  organizationId: string | null | undefined
  refTitle: string
  companyName: string
  isUpdate: boolean
  recipient: CustomerApprovalRecipientRow
}): Promise<boolean> {
  const recipient = await resolveCustomerApprovalRecipient(args.admin, args.recipient)
  if (!recipient) return false

  let portfolio: { manageUrl: string; publicPreviewUrl: string } | null = null
  try {
    portfolio = await getPortfolioManageAndPreviewUrlsForApprovalEmail(args.admin, args.referenceId)
  } catch (e) {
    console.error('[sendClientApprovalConfirmationEmail] portfolio links:', e)
  }

  if (!portfolio?.manageUrl) {
    console.error('[sendClientApprovalConfirmationEmail] no manage URL — skip email')
    return false
  }

  return sendCustomerSperrlinkEmail({
    admin: args.admin,
    organizationId: args.organizationId,
    refTitle: args.refTitle,
    companyName: args.companyName,
    manageUrl: portfolio.manageUrl,
    recipient: args.recipient,
    isNewLink: args.isUpdate,
  })
}

export async function getCustomerApprovalRecipientEmailImpl(
  referenceId: string
): Promise<string | null> {
  const { createServerSupabaseClient } = await import('@/lib/supabase/server')
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('references')
    .select(
      'approval_contact_id, approval_external_contact_id, approval_delegated_to_email, approval_delegated_to_name'
    )
    .eq('id', referenceId)
    .maybeSingle()

  if (!data) return null
  const resolved = await resolveCustomerApprovalRecipient(supabase, data as CustomerApprovalRecipientRow)
  return resolved?.email ?? null
}

export { fetchVendorOrganizationName }
