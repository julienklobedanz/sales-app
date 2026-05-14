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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  approveInternalAndSend,
  getApprovalLink,
  getContactOptionsForReference,
  resendClientApprovalEmail,
  withdrawApprovalRequest,
} from '@/app/dashboard/actions'
import type { ApprovalContactOption } from '@/app/dashboard/references/approval-contacts'

export function ApprovalPendingActions({
  referenceId,
  canInternalApprove,
  approvalStatus,
  internalStatus,
  approvalOwnerName,
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
  approvalOwnerName: string | null
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
  /** Referenz laut Status/Kunde nutzbar, DB-Feld approval_internal_status veraltet */
  staleInternalPending?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<ApprovalContactOption[]>([])
  const [contactId, setContactId] = useState('')

  if (staleInternalPending) {
    return (
      <p className="rounded-md border border-dashed border-border/80 bg-muted/20 p-2.5 text-xs text-muted-foreground leading-relaxed">
        Diese Referenz ist bereits freigegeben bzw. einsatzbereit — es sind keine weiteren Freigabe-Schritte nötig.
      </p>
    )
  }

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

  async function loadContactsForDialog() {
    setLoadingContacts(true)
    setContactId('')
    const res = await getContactOptionsForReference(referenceId)
    setLoadingContacts(false)
    if (res.error) {
      toast.error(res.error)
      setContacts([])
      return
    }
    setContacts(res.contacts)
    const opts = res.contacts
    const pick = (id: string | null, kind: ApprovalContactOption['kind']) => {
      if (!id) return false
      return opts.some((o) => o.id === id && o.kind === kind)
    }
    if (pick(approvalExternalContactId, 'external_contact')) {
      setContactId(approvalExternalContactId!)
    } else if (pick(approvalContactId, 'contact_person')) {
      setContactId(approvalContactId!)
    } else if (referenceCustomerContactId) {
      const m = opts.find((o) => o.id === referenceCustomerContactId)
      if (m) setContactId(m.id)
    } else if (referenceContactId) {
      const m = opts.find((o) => o.id === referenceContactId)
      if (m) setContactId(m.id)
    } else if (opts.length === 1) {
      setContactId(opts[0].id)
    }
  }

  function onResend() {
    startTransition(async () => {
      await resendClientApprovalEmail(referenceId)
      toast.success('Neuer Freigabe-Link ist aktiv. Bitte manuell an den Kunden senden.')
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
    const picked = contacts.find((c) => c.id === contactId)
    if (!picked) {
      toast.error('Bitte einen Empfänger mit E-Mail wählen.')
      return
    }
    startTransition(async () => {
      const recipient =
        picked.kind === 'external_contact'
          ? { externalContactId: picked.id }
          : { contactId: picked.id }
      const result = await approveInternalAndSend(referenceId, recipient)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setDialogOpen(false)
      toast.success('Kunden-Freigabe ist vorbereitet. Link unter „Link kopieren“ — kein automatischer Versand.')
      router.refresh()
    })
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-2.5">
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">{currentPhase}</p>
        <p className="text-xs text-muted-foreground">{responsibilityHint}</p>
      </div>
      {canInternalApprove ? (
        <Button
          type="button"
          variant="default"
          onClick={openInternalApproveDialog}
          disabled={disableInternalApprove}
        >
          Interne Freigabe & Kundenlink vorbereiten
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onResend} disabled={disableResend} title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}>
          Neuen Link erzeugen
        </Button>
        <Button type="button" variant="outline" onClick={onCopyLink} disabled={disableCopy} title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}>
          Link kopieren
        </Button>
      </div>
      <Button type="button" variant="destructive" onClick={onWithdraw} disabled={disableWithdraw} title={isClientPending ? undefined : 'Nur bei laufender Kundenanfrage verfügbar'}>
        Anfrage widerrufen
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kundenkontakt für die Freigabe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Es wird kein automatischer E-Mail-Versand ausgelöst. Der gewählte Kontakt wird gespeichert; den
            Freigabe-Link kopieren Sie anschließend und senden ihn manuell (z. B. per E-Mail aus dem Account).
          </p>
          <div className="grid gap-2 py-2">
            <Label htmlFor="internal-approve-contact">Kontakt</Label>
            <Select value={contactId} onValueChange={setContactId} disabled={loadingContacts || contacts.length === 0}>
              <SelectTrigger id="internal-approve-contact">
                <SelectValue placeholder={loadingContacts ? 'Lade Kontakte…' : contacts.length ? 'Kontakt wählen' : 'Kein Kontakt mit E-Mail'} />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={`${c.kind}-${c.id}`} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingContacts && contacts.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-500">
                Kein Kontakt mit E-Mail für dieses Unternehmen. Bitte unter Accounts einen Kundenkontakt anlegen oder in der Referenz einen Kontakt verknüpfen.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="button" onClick={onConfirmInternalApprove} disabled={pending || !contactId || loadingContacts}>
              Freigabe vorbereiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
