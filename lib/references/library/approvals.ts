export type {
  PrepareCustomerApprovalResult,
  ApproveInternalRecipientOptions,
  RequestCustomerApprovalAgainResult,
} from '@/lib/references/library/approvals-types'

export { submitForApprovalImpl } from '@/lib/references/library/approvals-submit'
export { prepareCustomerApprovalImpl } from '@/lib/references/library/approvals-approve-internal'
export {
  getApprovalLinkImpl,
  resendClientApprovalEmailImpl,
  withdrawApprovalRequestImpl,
} from '@/lib/references/library/approvals-client-actions'
export { requestCustomerApprovalAgainAfterChangesImpl } from '@/lib/references/library/approvals-customer-follow-up'
export {
  updateApprovalCoordinatorImpl,
  updateApprovalRecipientImpl,
} from '@/lib/references/library/approvals-update-contact'
