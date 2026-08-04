import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ApprovalBadge } from '@/lib/references/reference-approval-display'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { ReferenceReadinessActions } from './reference-readiness-actions'
import { ReferenceReadinessValue } from './reference-readiness-value'

export type ReferenceDetailApprovalCardProps = {
  referenceId: string
  isSalesView: boolean
  isNdaDeal: boolean
  ndaDealBadgeClass: string
  workflowStatusBadges: { internal: ApprovalBadge; customer: ApprovalBadge }
  requestedByDisplay: string | null
  coordinatorDisplay: string | null
  approvingCustomerDisplay: string | null
  delegatedRecipientDisplay: string | null
  competitorBlacklist: string[]
  customerAccessRevoked: boolean
  approvalQuoteApproved: string | null
  approvalQuoteProposed: string | null
  approvalConsentFileUrl: string | null
  readinessState: ReferenceReadinessState
  existingSharePath: string | null
  canStartApproval: boolean
  canInternalApprove: boolean
  defaultAccountManagerEmail: string | null
  autoOpenApprovalDialog: boolean
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
  hasCustomerChangeRequests: boolean
  canEditCustomerEmail: boolean
  canEditCoordinatorEmail: boolean
  customerChangeRequestComment: string | null
}

export function ReferenceDetailApprovalCard(props: ReferenceDetailApprovalCardProps) {
  const {
    referenceId,
    isSalesView,
    isNdaDeal,
    ndaDealBadgeClass,
    workflowStatusBadges,
    requestedByDisplay,
    coordinatorDisplay,
    approvingCustomerDisplay,
    delegatedRecipientDisplay,
    competitorBlacklist,
    customerAccessRevoked,
    approvalQuoteApproved,
    approvalQuoteProposed,
    approvalConsentFileUrl,
    readinessState,
    existingSharePath,
    canStartApproval,
    canInternalApprove,
    defaultAccountManagerEmail,
    autoOpenApprovalDialog,
    approvalContactId,
    approvalExternalContactId,
    referenceContactId,
    referenceCustomerContactId,
    hasCustomerChangeRequests,
    canEditCustomerEmail,
    canEditCoordinatorEmail,
    customerChangeRequestComment,
  } = props

  return (
    <Card className={cn('w-full min-w-0', isSalesView ? 'order-2' : undefined)}>
      <CardHeader>
        <CardTitle className="text-base">Freigabestatus</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3 text-sm transition-all duration-200">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="shrink-0 pt-0.5 text-muted-foreground">Unter NDA?</span>
            <span
              className={`min-w-0 max-w-[58%] shrink whitespace-normal rounded-full border px-2.5 py-0.5 text-right text-xs font-medium leading-tight transition-colors duration-200 ${ndaDealBadgeClass}`}
            >
              {isNdaDeal ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="shrink-0 pt-0.5 text-muted-foreground">Intern</span>
            <span
              className={cn(
                'min-w-0 max-w-[58%] shrink whitespace-normal rounded-full border px-2.5 py-0.5 text-right text-xs font-medium leading-tight transition-colors duration-200',
                workflowStatusBadges.internal.className,
              )}
            >
              {workflowStatusBadges.internal.label}
            </span>
          </div>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="shrink-0 pt-0.5 text-muted-foreground">Kunde</span>
            <span
              className={cn(
                'min-w-0 max-w-[58%] shrink whitespace-normal rounded-full border px-2.5 py-0.5 text-right text-xs font-medium leading-tight transition-colors duration-200',
                workflowStatusBadges.customer.className,
              )}
            >
              {workflowStatusBadges.customer.label}
            </span>
          </div>
          {!isSalesView ? (
            <>
              {requestedByDisplay ? (
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">
                    Angefragt von
                  </span>
                  <ReferenceReadinessValue value={requestedByDisplay} />
                </div>
              ) : null}
              {coordinatorDisplay ? (
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">
                    Accountverantw.
                  </span>
                  <ReferenceReadinessValue value={coordinatorDisplay} />
                </div>
              ) : null}
              {approvingCustomerDisplay ? (
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">Kunde</span>
                  <ReferenceReadinessValue value={approvingCustomerDisplay} />
                </div>
              ) : null}
              {delegatedRecipientDisplay ? (
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">
                    Aktueller Empfänger
                  </span>
                  <ReferenceReadinessValue value={delegatedRecipientDisplay} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        {isSalesView ? null : (
          <>
            {competitorBlacklist.length ? (
              <div className="space-y-1.5">
                <p className="text-muted-foreground">Nicht verwenden für</p>
                <div className="flex flex-wrap gap-1.5">
                  {competitorBlacklist.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {!customerAccessRevoked &&
            (approvalQuoteApproved || approvalQuoteProposed) ? (
              <div className="space-y-1.5">
                <p className="text-muted-foreground">Zitat</p>
                <p className="rounded-md border bg-muted/20 p-2 text-xs">
                  {approvalQuoteApproved ?? approvalQuoteProposed}
                </p>
              </div>
            ) : null}
            {approvalConsentFileUrl ? (
              <a
                className="text-xs text-blue-600 underline"
                href={approvalConsentFileUrl}
                target="_blank"
                rel="noreferrer"
              >
                Consent-Dokument ansehen
              </a>
            ) : null}
          </>
        )}
        <ReferenceReadinessActions
          referenceId={referenceId}
          readiness={readinessState}
          existingSharePath={existingSharePath}
          canStartApproval={canStartApproval}
          canInternalApprove={canInternalApprove}
          defaultAccountManagerEmail={defaultAccountManagerEmail}
          autoOpenApprovalDialog={autoOpenApprovalDialog}
          approvalContactId={approvalContactId}
          approvalExternalContactId={approvalExternalContactId}
          referenceContactId={referenceContactId}
          referenceCustomerContactId={referenceCustomerContactId}
          hasCustomerChangeRequests={hasCustomerChangeRequests}
          canEditCustomerEmail={canEditCustomerEmail}
          canEditCoordinatorEmail={canEditCoordinatorEmail}
          customerChangeRequestComment={customerChangeRequestComment}
        />
      </CardContent>
    </Card>
  )
}
