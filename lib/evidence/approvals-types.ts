import type { SubmitForApprovalOptions } from '@/lib/evidence/approval-submit-types'

export type ReferenceApprovalRow = {
  id?: string
  title: string
  status: string | null
  company_id: string
  contact_id: string | null
  customer_contact_id: string | null
  approval_contact_id?: string | null
  approval_external_contact_id?: string | null
  customer_approval_status: string | null
  approval_reference_status_snapshot: string | null
  approval_requested_by?: string | null
  approval_owner_name?: string | null
  approval_expires_at?: string | null
  approval_scope_named_mention?: boolean | null
  approval_scope_anonymous_mention?: boolean | null
  approval_scope_reference_call?: boolean | null
  approval_scope_logo_use?: boolean | null
  approval_scope_press_release?: boolean | null
  approval_reference_giver_name?: string | null
  approval_reference_giver_title?: string | null
  approval_competitor_blacklist?: string[] | null
  approval_quote_proposed?: string | null
  companies: { name?: string } | { name?: string }[] | null
}

export type ResolvedApprovalRecipient = {
  email: string
  firstName: string
  approvalContactId: string | null
  approvalExternalContactId: string | null
}

export type ApproveInternalAndSendResult =
  | { success: true; customerEmailSent: boolean; recipientEmail: string }
  | { success: false; error: string }

export type ApproveInternalRecipientOptions = Pick<
  SubmitForApprovalOptions,
  'contactId' | 'externalContactId'
> & {
  /** Freitext-E-Mail, wenn kein Kontakt aus der Liste gewählt wurde */
  recipientEmail?: string
}

export type RequestCustomerApprovalAgainResult =
  | {
      success: true
      emailSent: boolean
      emailMocked?: boolean
      recipientEmail: string
      devRedirected?: boolean
      originalRecipientEmail?: string
    }
  | { success: false; error: string }
