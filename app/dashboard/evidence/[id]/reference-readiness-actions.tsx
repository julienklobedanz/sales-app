'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LinkIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { AppIcon } from '@/lib/icons'
import { canSubmitApprovalRecipient } from '@/lib/references/approval-recipient-input'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { cn } from '@/lib/utils'
import { ApprovalContactSuggestField } from './approval-contact-suggest-field'
import { RequestApprovalDialog } from './request-approval-dialog'

type Props = {
  referenceId: string
  readiness: ReferenceReadinessState
  canStartApproval: boolean
  canInternalApprove: boolean
  defaultInternalOwnerName?: string | null
  autoOpenApprovalDialog?: boolean
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
}

export function ReferenceReadinessActions({
  referenceId,
  readiness,
  canStartApproval,
  canInternalApprove,
  defaultInternalOwnerName,
  autoOpenApprovalDialog = false,
  approvalContactId,
  approvalExternalContactId,
  referenceContactId,
  referenceCustomerContactId,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<ApprovalContactOption[]>([])
  const [contactQuery, setContactQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<ApprovalContactOption | null>(null)

  const canConfirmRecipient = canSubmitApprovalRecipient({
    query: contactQuery,
    selected: selectedContact,
  })

  const showActions =
    readiness.showPrimaryStart ||
    readiness.showMagicLink ||
    readiness.showRegenerateLink ||
    readiness.showWithdraw

  if (!showActions && !readiness.showStaleHint) {
    return null
  }

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
      toast.success('Freigabe vorbereitet. Magic Link kopieren und an den Kunden senden.')
      router.refresh()
    })
  }

  function onMagicLink() {
    startTransition(async () => {
      const link = await getApprovalLink(referenceId)
      if (!link) {
        toast.error('Noch kein Freigabelink verfügbar.')
        return
      }
      await navigator.clipboard.writeText(link)
      toast.success('Magic Link kopiert.')
    })
  }

  function onRegenerateLink() {
    startTransition(async () => {
      await resendClientApprovalEmail(referenceId)
      setRegenerateOpen(false)
      toast.success('Neuer Link ist aktiv. Bitte erneut kopieren und versenden.')
      router.refresh()
    })
  }

  function onWithdraw() {
    startTransition(async () => {
      await withdrawApprovalRequest(referenceId)
      toast.success('Anfrage widerrufen.')
      router.refresh()
    })
  }

  const primaryIsRequest =
    readiness.phase === 'request_approval' && canStartApproval && readiness.showPrimaryStart
  const primaryIsInternal =
    readiness.phase === 'internal_start' && canInternalApprove && readiness.showPrimaryStart

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center gap-3 border-t border-border/60 pt-4 transition-all duration-200 ease-out',
        !showActions && readiness.showStaleHint && 'border-t-0 pt-0'
      )}
    >
      {readiness.showStaleHint ? (
        <p className="max-w-full text-center text-xs text-muted-foreground leading-relaxed">
          Referenz ist einsatzbereit — Freigabe-Schritte abgeschlossen.
        </p>
      ) : null}

      {primaryIsRequest ? (
        <div className="w-full max-w-sm transition-opacity duration-200">
          <RequestApprovalDialog
            referenceId={referenceId}
            defaultInternalOwnerName={defaultInternalOwnerName}
            triggerId="reference-readiness-approval-trigger"
            triggerVariant="default"
            triggerClassName="w-full"
            triggerLabel="Freigabe starten"
            autoOpen={autoOpenApprovalDialog}
          />
        </div>
      ) : null}

      {primaryIsInternal ? (
        <Button
          type="button"
          variant="default"
          className="w-full max-w-sm transition-opacity duration-200"
          onClick={openInternalApproveDialog}
          disabled={pending}
        >
          Freigabe starten
        </Button>
      ) : null}

      {readiness.showMagicLink ? (
        <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5 transition-opacity duration-200">
          <Button
            type="button"
            variant="default"
            className="w-full gap-2"
            onClick={onMagicLink}
            disabled={pending}
          >
            <AppIcon icon={LinkIcon} size={16} />
            Magic Link
          </Button>
          {readiness.showRegenerateLink ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setRegenerateOpen(true)}
              disabled={pending}
            >
              Neuer Link
            </Button>
          ) : null}
        </div>
      ) : null}

      {readiness.showWithdraw ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 text-destructive hover:bg-destructive/10 hover:text-destructive transition-opacity duration-200"
          onClick={onWithdraw}
          disabled={pending}
        >
          Anfrage widerrufen
        </Button>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kundenkontakt für die Freigabe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Es wird kein automatischer E-Mail-Versand ausgelöst. Der Kontakt wird gespeichert; den
            Freigabe-Link kopieren Sie anschließend und senden ihn manuell. Unbekannte E-Mail-Adressen
            werden als Kundenkontakt angelegt.
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
              Freigabe vorbereiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuen Freigabelink erzeugen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der bisherige Link verliert damit seine Gültigkeit. Sie müssen den neuen Magic Link erneut
              an den Kunden senden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => onRegenerateLink()}>
              Neuen Link erzeugen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
