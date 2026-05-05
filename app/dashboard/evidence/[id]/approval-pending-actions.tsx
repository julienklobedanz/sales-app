'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  approveInternalAndSend,
  getApprovalLink,
  resendClientApprovalEmail,
  withdrawApprovalRequest,
} from '@/app/dashboard/actions'

export function ApprovalPendingActions({
  referenceId,
  canInternalApprove,
  approvalStatus,
  internalStatus,
  approvalOwnerName,
}: {
  referenceId: string
  canInternalApprove: boolean
  approvalStatus: string
  internalStatus: string
  approvalOwnerName: string | null
}) {
  const [pending, startTransition] = useTransition()

  const isInternalPending = internalStatus === 'pending_internal'
  const isClientPending = approvalStatus === 'pending'
  const isApproved = approvalStatus === 'approved'
  const isRejected = approvalStatus === 'rejected'
  const isExpired = approvalStatus === 'expired'

  const disableResend = pending || !isClientPending
  const disableCopy = pending || !isClientPending
  const disableWithdraw = pending || !isClientPending
  const disableInternalApprove = pending || !isInternalPending || !canInternalApprove

  const currentPhase = isInternalPending
    ? 'Interne Freigabe ausstehend'
    : isClientPending
      ? 'Kundenfreigabe läuft'
      : isApproved
        ? 'Kundenfreigabe erteilt'
        : isRejected
          ? 'Kundenfreigabe abgelehnt'
          : isExpired
            ? 'Freigabe abgelaufen'
            : 'Keine aktive Freigabeanfrage'

  const responsibilityHint = isInternalPending
    ? canInternalApprove
      ? 'Zuständig: Du kannst intern freigeben und danach den Versand auslösen.'
      : 'Zuständig: Admin oder Account Manager muss die interne Freigabe erteilen.'
    : isClientPending
      ? `Zuständig: Kunde (${approvalOwnerName ?? 'Approval Owner nicht hinterlegt'}) muss freigeben.`
      : isApproved
        ? 'Status klar: bereits freigegeben, keine Erinnerungen oder Widerruf mehr nötig.'
        : isRejected
          ? 'Status klar: Anfrage wurde abgelehnt. Optional neue Anfrage mit angepasstem Scope starten.'
          : isExpired
            ? 'Status klar: Freigabe ist abgelaufen. Bitte neue Anfrage starten.'
            : 'Status klar: noch keine aktive Anfrage. Starte die Freigabe über „Aktionen“.'

  function onResend() {
    startTransition(async () => {
      await resendClientApprovalEmail(referenceId)
      toast.success('Erinnerung versendet.')
    })
  }

  function onCopyLink() {
    startTransition(async () => {
      const link = await getApprovalLink(referenceId)
      if (!link) {
        toast.error('Noch kein externer Freigabelink verfügbar.')
        return
      }
      await navigator.clipboard.writeText(link)
      toast.success('Freigabelink kopiert.')
    })
  }

  function onWithdraw() {
    startTransition(async () => {
      await withdrawApprovalRequest(referenceId)
      toast.success('Anfrage widerrufen.')
    })
  }

  function onApproveAndSend() {
    startTransition(async () => {
      const result = await approveInternalAndSend(referenceId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Interne Freigabe erteilt, E-Mail an Kunden versendet.')
    })
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-2.5">
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">{currentPhase}</p>
        <p className="text-xs text-muted-foreground">{responsibilityHint}</p>
      </div>
      {canInternalApprove ? (
        <Button type="button" variant="default" onClick={onApproveAndSend} disabled={disableInternalApprove}>
          Interne Freigabe erteilen & Versand
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onResend} disabled={disableResend} title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}>
          Erinnerung senden
        </Button>
        <Button type="button" variant="outline" onClick={onCopyLink} disabled={disableCopy} title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}>
          Link kopieren
        </Button>
      </div>
      <Button type="button" variant="destructive" onClick={onWithdraw} disabled={disableWithdraw} title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}>
        Anfrage widerrufen
      </Button>
    </div>
  )
}
