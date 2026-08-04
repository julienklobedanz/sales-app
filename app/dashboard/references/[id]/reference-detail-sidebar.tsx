import {
  ReferenceDetailProjectCard,
  type ReferenceDetailProjectCardProps,
} from './reference-detail-project-card'
import {
  ReferenceDetailApprovalCard,
  type ReferenceDetailApprovalCardProps,
} from './reference-detail-approval-card'
import {
  ReferenceDetailActionsCard,
  type ReferenceDetailActionsCardProps,
} from './reference-detail-actions-card'

export type ReferenceDetailSidebarProps = ReferenceDetailProjectCardProps &
  ReferenceDetailApprovalCardProps &
  ReferenceDetailActionsCardProps

export function ReferenceDetailSidebar(props: ReferenceDetailSidebarProps) {
  return (
    <div className="lg:sticky lg:top-6 space-y-4 h-fit">
      <ReferenceDetailProjectCard
        isSalesView={props.isSalesView}
        volumeEur={props.volumeEur}
        contractType={props.contractType}
        projectStart={props.projectStart}
        projectEnd={props.projectEnd}
        projectStatus={props.projectStatus}
        orgDateFmt={props.orgDateFmt}
        incumbentProvider={props.incumbentProvider}
        competitors={props.competitors}
      />
      <ReferenceDetailApprovalCard
        referenceId={props.referenceId}
        isSalesView={props.isSalesView}
        isNdaDeal={props.isNdaDeal}
        ndaDealBadgeClass={props.ndaDealBadgeClass}
        workflowStatusBadges={props.workflowStatusBadges}
        requestedByDisplay={props.requestedByDisplay}
        coordinatorDisplay={props.coordinatorDisplay}
        approvingCustomerDisplay={props.approvingCustomerDisplay}
        delegatedRecipientDisplay={props.delegatedRecipientDisplay}
        competitorBlacklist={props.competitorBlacklist}
        customerAccessRevoked={props.customerAccessRevoked}
        approvalQuoteApproved={props.approvalQuoteApproved}
        approvalQuoteProposed={props.approvalQuoteProposed}
        approvalConsentFileUrl={props.approvalConsentFileUrl}
        readinessState={props.readinessState}
        existingSharePath={props.existingSharePath}
        canStartApproval={props.canStartApproval}
        canInternalApprove={props.canInternalApprove}
        defaultAccountManagerEmail={props.defaultAccountManagerEmail}
        autoOpenApprovalDialog={props.autoOpenApprovalDialog}
        approvalContactId={props.approvalContactId}
        approvalExternalContactId={props.approvalExternalContactId}
        referenceContactId={props.referenceContactId}
        referenceCustomerContactId={props.referenceCustomerContactId}
        hasCustomerChangeRequests={props.hasCustomerChangeRequests}
        canEditCustomerEmail={props.canEditCustomerEmail}
        canEditCoordinatorEmail={props.canEditCoordinatorEmail}
        customerChangeRequestComment={props.customerChangeRequestComment}
      />
      <ReferenceDetailActionsCard
        referenceId={props.referenceId}
        isSalesView={props.isSalesView}
        isFavorited={props.isFavorited}
        canManageAsAdmin={props.canManageAsAdmin}
      />
    </div>
  )
}
