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
}: {
  referenceId: string
  canInternalApprove: boolean
}) {
  const [pending, startTransition] = useTransition()

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
      await approveInternalAndSend(referenceId)
      toast.success('Interne Freigabe erteilt, E-Mail an Kunden versendet.')
    })
  }

  return (
    <div className="grid gap-2">
      {canInternalApprove ? (
        <Button type="button" variant="default" onClick={onApproveAndSend} disabled={pending}>
          Interne Freigabe erteilen & Versand
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onResend} disabled={pending}>
          Erinnerung senden
        </Button>
        <Button type="button" variant="outline" onClick={onCopyLink} disabled={pending}>
          Link kopieren
        </Button>
      </div>
      <Button type="button" variant="destructive" onClick={onWithdraw} disabled={pending}>
        Anfrage widerrufen
      </Button>
    </div>
  )
}
