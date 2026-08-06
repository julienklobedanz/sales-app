'use client'

import { Pencil } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { RequestApprovalDialog } from '../request-approval-dialog'

export function ReferenceReadinessPrimaryActions({
  referenceId,
  readiness,
  pending,
  canInternalApprove,
  defaultAccountManagerEmail,
  autoOpenApprovalDialog,
  primaryIsRequest,
  primaryIsPrepareCustomer,
  primaryIsWithdrawnRestart,
  onPrepareCustomer,
}: {
  referenceId: string
  readiness: ReferenceReadinessState
  pending: boolean
  canInternalApprove: boolean
  defaultAccountManagerEmail?: string | null
  autoOpenApprovalDialog: boolean
  primaryIsRequest: boolean
  primaryIsPrepareCustomer: boolean
  primaryIsWithdrawnRestart: boolean
  onPrepareCustomer: () => void
}) {
  return (
    <>
      {primaryIsRequest ? (
        <div className="w-full max-w-sm transition-opacity duration-200">
          <RequestApprovalDialog
            referenceId={referenceId}
            defaultAccountManagerEmail={defaultAccountManagerEmail}
            triggerId="reference-readiness-approval-trigger"
            triggerVariant="default"
            triggerClassName="w-full"
            triggerLabel="Freigabe starten"
            autoOpen={autoOpenApprovalDialog}
          />
        </div>
      ) : null}

      {readiness.phase === 'internal_start' ? (
        <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
          {canInternalApprove
            ? 'Bitte bestätigen Sie zuerst die interne Freigabe über den Button „Intern freigeben“ in Ihrer E-Mail. Danach können Sie hier die Kundenfreigabe vorbereiten.'
            : 'Interne Freigabe ausstehend — der Account Manager muss den Link in der E-Mail bestätigen, bevor die Kundenfreigabe vorbereitet werden kann.'}
        </p>
      ) : null}

      {primaryIsPrepareCustomer ? (
        <Button
          type="button"
          variant="default"
          className="w-full max-w-sm transition-opacity duration-200"
          onClick={onPrepareCustomer}
          disabled={pending}
        >
          Kundenfreigabe vorbereiten
        </Button>
      ) : null}

      {primaryIsWithdrawnRestart ? (
        <div className="w-full max-w-sm transition-opacity duration-200">
          <RequestApprovalDialog
            referenceId={referenceId}
            defaultAccountManagerEmail={defaultAccountManagerEmail}
            triggerId="reference-readiness-withdrawn-restart-trigger"
            triggerVariant="default"
            triggerClassName="w-full"
            triggerLabel="Freigabe erneut starten"
          />
        </div>
      ) : null}
    </>
  )
}

export function ReferenceReadinessWorkflowReroute({
  readiness,
  pending,
  showWorkflowRerouteActions,
  canEditCoordinatorEmail,
  canEditCustomerEmail,
  onOpenEditCoordinator,
  onOpenEditRecipient,
  onWithdraw,
}: {
  readiness: ReferenceReadinessState
  pending: boolean
  showWorkflowRerouteActions: boolean
  canEditCoordinatorEmail: boolean
  canEditCustomerEmail: boolean
  onOpenEditCoordinator: () => void
  onOpenEditRecipient: () => void
  onWithdraw: () => void
}) {
  return (
    <>
      {showWorkflowRerouteActions ? (
        <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5 transition-opacity duration-200">
          {canEditCoordinatorEmail ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={onOpenEditCoordinator}
              disabled={pending}
            >
              <AppIcon icon={Pencil} size={16} />
              Interne Anspr. E-Mail ändern
            </Button>
          ) : null}
          {canEditCustomerEmail && !readiness.showMagicLink ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={onOpenEditRecipient}
              disabled={pending}
            >
              <AppIcon icon={Pencil} size={16} />
              Kunden E-Mail ändern
            </Button>
          ) : null}
          {readiness.showWithdraw ? (
            <Button
              type="button"
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onWithdraw}
              disabled={pending}
            >
              Anfrage widerrufen
            </Button>
          ) : null}
        </div>
      ) : null}

      {readiness.showWithdraw &&
      !readiness.showMagicLink &&
      !showWorkflowRerouteActions ? (
        <Button
          type="button"
          variant="outline"
          className="w-full max-w-sm border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive transition-opacity duration-200"
          onClick={onWithdraw}
          disabled={pending}
        >
          Anfrage widerrufen
        </Button>
      ) : null}
    </>
  )
}
