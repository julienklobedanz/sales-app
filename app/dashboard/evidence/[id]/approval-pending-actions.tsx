'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  approveInternalAndSend,
  getApprovalLink,
  getContactOptionsForReference,
  resendClientApprovalEmail,
  withdrawApprovalRequest,
} from '@/app/dashboard/actions'
import type { ApprovalContactOption } from '@/app/dashboard/references/approval-contacts'
import type { ApproveInternalRecipientOptions } from '@/app/dashboard/references/approvals'
import { canSubmitApprovalRecipient } from '@/lib/references/approval-recipient-input'
import { ApprovalContactSuggestField } from './approval-contact-suggest-field'

export function ApprovalPendingActions({
  referenceId,
  canInternalApprove,
  approvalStatus,
  internalStatus,
  approvalContactId,
  approvalExternalContactId,
  referenceContactId,
  referenceCustomerContactId,
  staleInternalPending = false,
}: {
  referenceId: string
  canInternalApprove: boolean
  approvalStatus: string
  internalStatus: string
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
  staleInternalPending?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<ApprovalContactOption[]>([])
  const [contactQuery, setContactQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<ApprovalContactOption | null>(null)

  if (staleInternalPending) {
    return (
      <p className="max-w-xs text-center text-xs text-muted-foreground leading-relaxed">
        Diese Referenz ist bereits freigegeben bzw. einsatzbereit — es sind keine weiteren Freigabe-Schritte nötig.
      </p>
    )
  }

  const isInternalPending = internalStatus === 'pending_internal'
  const isClientPending = approvalStatus === 'pending'

  if (!isInternalPending && !isClientPending) {
    return null
  }

  const disableResend = pending || !isClientPending
  const disableCopy = pending || !isClientPending
  const disableWithdraw = pending || !isClientPending
  const isInternallyApproved = internalStatus === 'approved_internal'
  const disableInternalApprove =
    pending || !isInternallyApproved || isClientPending || !canInternalApprove

  const canConfirmRecipient = canSubmitApprovalRecipient({
    query: contactQuery,
    selected: selectedContact,
  })

  function prefillFromContacts(opts: ApprovalContactOption[]) {
    const pick = (id: string | null) => {
      if (!id) return null
      return opts.find((o) => o.id === id) ?? null
    }
    const preferred =
      pick(approvalExternalContactId) ??
      pick(approvalContactId) ??
      pick(referenceCustomerContactId) ??
      pick(referenceContactId) ??
      (opts.length === 1 ? opts[0] : null)

    if (preferred) {
      setSelectedContact(preferred)
      setContactQuery(preferred.email ?? preferred.label)
    }
  }

  async function loadContactsForDialog() {
    setLoadingContacts(true)
    setContactQuery('')
    setSelectedContact(null)
    const res = await getContactOptionsForReference(referenceId)
    setLoadingContacts(false)
    if (res.error) {
      toast.error(res.error)
      setContacts([])
      return
    }
    setContacts(res.contacts)
    prefillFromContacts(res.contacts)
  }

  function buildRecipientPayload(): ApproveInternalRecipientOptions | null {
    if (selectedContact?.email?.includes('@')) {
      return selectedContact.kind === 'external_contact'
        ? { externalContactId: selectedContact.id }
        : { contactId: selectedContact.id }
    }
    if (canSubmitApprovalRecipient({ query: contactQuery, selected: null })) {
      return { recipientEmail: contactQuery.trim() }
    }
    return null
  }

  function onResend() {
    startTransition(async () => {
      try {
        await resendClientApprovalEmail(referenceId)
        toast.success('Neuer Freigabe-Link ist aktiv. Bitte manuell an den Kunden senden.')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Freigabe-Link konnte nicht erneuert werden.')
      }
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

  function openInternalApproveDialog() {
    setDialogOpen(true)
    void loadContactsForDialog()
  }

  function onConfirmInternalApprove() {
    const recipient = buildRecipientPayload()
    if (!recipient) {
      toast.error('Bitte E-Mail-Adresse eingeben oder einen Kontakt mit E-Mail auswählen.')
      return
    }
    startTransition(async () => {
      const result = await approveInternalAndSend(referenceId, recipient)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setDialogOpen(false)
      if (result.customerEmailSent) {
        toast.success(
          `Freigabe-Anfrage mit Magic Link wurde an ${result.recipientEmail} gesendet.`
        )
      } else {
        toast.success(
          'Kundenfreigabe vorbereitet. E-Mail-Versand nicht möglich — Freigabe-Link kopieren und manuell senden.'
        )
      }
      router.refresh()
    })
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-stretch gap-2">
      {canInternalApprove ? (
        <Button
          type="button"
          variant="default"
          className="w-full"
          onClick={openInternalApproveDialog}
          disabled={disableInternalApprove}
        >
          Freigabe starten
        </Button>
      ) : null}
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onResend}
          disabled={disableResend}
          title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}
        >
          Neuer Link
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onCopyLink}
          disabled={disableCopy}
          title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}
        >
          Link kopieren
        </Button>
      </div>
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={onWithdraw}
        disabled={disableWithdraw}
        title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}
      >
        Anfrage widerrufen
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kundenkontakt für die Freigabe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Es wird kein automatischer E-Mail-Versand ausgelöst. Der Kontakt wird gespeichert; den
            Freigabe-Link kopieren Sie anschließend und senden ihn manuell (z. B. per E-Mail aus dem
            Account). Unbekannte E-Mail-Adressen werden als Kundenkontakt angelegt.
          </p>
          <div className="grid gap-2 py-2">
            <Label htmlFor="internal-approve-contact">Kontakt (Name oder E-Mail)</Label>
            <ApprovalContactSuggestField
              id="internal-approve-contact"
              contacts={contacts}
              loading={loadingContacts}
              disabled={pending}
              value={contactQuery}
              selected={selectedContact}
              onValueChange={setContactQuery}
              onSelectContact={(c) => {
                setSelectedContact(c)
                setContactQuery(c.email ?? c.label)
              }}
              onClearSelection={() => setSelectedContact(null)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={onConfirmInternalApprove}
              disabled={pending || loadingContacts || !canConfirmRecipient}
            >
              Kundenfreigabe vorbereiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
