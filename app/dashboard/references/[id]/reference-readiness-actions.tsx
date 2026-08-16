'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Shield } from '@hugeicons/core-free-icons'
import {
  prepareCustomerApproval,
  getApprovalLink,
  getContactOptionsForReference,
  requestCustomerApprovalAgainAfterChanges,
  resendClientApprovalEmail,
  updateApprovalCoordinator,
  updateApprovalRecipient,
  withdrawApprovalRequest,
} from '@/app/dashboard/actions'
import { canSubmitApprovalRecipient, isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'
import type { ApprovalContactOption } from '@/lib/references/library/approval-contacts'
import type { ApproveInternalRecipientOptions } from '@/lib/references/library/approvals'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/lib/icons'
import { RequestApprovalDialog } from './request-approval-dialog'
import { ReferenceReadinessActionDialogs } from './reference-readiness/reference-readiness-action-dialogs'

type Props = {
  referenceId: string
  readiness: ReferenceReadinessState
  canStartApproval: boolean
  canInternalApprove: boolean
  defaultAccountManagerEmail?: string | null
  autoOpenApprovalDialog?: boolean
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
  hasCustomerChangeRequests?: boolean
  canEditCustomerEmail?: boolean
  canEditCoordinatorEmail?: boolean
  customerChangeRequestComment?: string | null
}

export function ReferenceReadinessActions({
  referenceId,
  readiness,
  canStartApproval,
  canInternalApprove,
  defaultAccountManagerEmail,
  autoOpenApprovalDialog = false,
  approvalContactId,
  approvalExternalContactId,
  referenceContactId,
  referenceCustomerContactId,
  hasCustomerChangeRequests = false,
  canEditCustomerEmail = false,
  canEditCoordinatorEmail = false,
  customerChangeRequestComment = null,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [changeRequestsDismissed, setChangeRequestsDismissed] = useState(false)
  const [requestOpen, setRequestOpen] = useState(autoOpenApprovalDialog)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecipientOpen, setEditRecipientOpen] = useState(false)
  const [editCoordinatorOpen, setEditCoordinatorOpen] = useState(false)
  const [coordinatorEmail, setCoordinatorEmail] = useState('')
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [changeCommentOpen, setChangeCommentOpen] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<ApprovalContactOption[]>([])
  const [contactQuery, setContactQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<ApprovalContactOption | null>(
    null,
  )

  const canConfirmRecipient = canSubmitApprovalRecipient({
    query: contactQuery,
    selected: selectedContact,
  })

  const visibleChangeRequestComment =
    !changeRequestsDismissed && customerChangeRequestComment?.trim()
      ? customerChangeRequestComment.trim()
      : null
  const showRequestApprovalAgain = hasCustomerChangeRequests && !changeRequestsDismissed

  const primaryIsRequest =
    readiness.phase === 'request_approval' &&
    canStartApproval &&
    readiness.showPrimaryStart
  const primaryIsPrepareCustomer =
    readiness.phase === 'prepare_customer' &&
    canInternalApprove &&
    readiness.showPrimaryStart
  const primaryIsWithdrawnRestart =
    readiness.phase === 'withdrawn' && readiness.showPrimaryStart
  const showStart = primaryIsRequest || primaryIsPrepareCustomer || primaryIsWithdrawnRestart
  const startLabel = primaryIsPrepareCustomer
    ? 'Kundenfreigabe vorbereiten'
    : primaryIsWithdrawnRestart
      ? 'Freigabe erneut starten'
      : 'Freigabe starten'

  const showMenu =
    showStart ||
    readiness.showMagicLink ||
    readiness.showRegenerateLink ||
    readiness.showWithdraw ||
    showRequestApprovalAgain ||
    canEditCustomerEmail ||
    (canEditCoordinatorEmail && readiness.showWithdraw && !readiness.showMagicLink) ||
    Boolean(visibleChangeRequestComment)

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

  function openEditRecipientDialog() {
    setEditRecipientOpen(true)
    void loadContactsForDialog()
  }

  function openEditCoordinatorDialog() {
    setCoordinatorEmail('')
    setEditCoordinatorOpen(true)
  }

  function onStartSelect() {
    if (primaryIsPrepareCustomer) {
      openInternalApproveDialog()
      return
    }
    setRequestOpen(true)
  }

  function onConfirmEditCoordinator() {
    const email = coordinatorEmail.trim()
    if (!isApprovalRecipientEmail(email)) {
      toast.error('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    startTransition(async () => {
      const result = await updateApprovalCoordinator(referenceId, email)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setEditCoordinatorOpen(false)
      if (result.emailSent) {
        toast.success(
          'Interne Ansprechperson wurde aktualisiert und per E-Mail informiert.',
        )
      } else {
        toast.success(
          'Interne Ansprechperson wurde aktualisiert. E-Mail-Versand nicht möglich — bitte direkt informieren.',
        )
      }
      router.refresh()
    })
  }

  function onConfirmEditRecipient() {
    const recipient = buildRecipientPayload()
    if (!recipient) {
      toast.error(
        'Bitte E-Mail-Adresse eingeben oder einen Kontakt mit E-Mail auswählen.',
      )
      return
    }
    startTransition(async () => {
      const result = await updateApprovalRecipient(referenceId, recipient)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setEditRecipientOpen(false)
      toast.success('Kunden-E-Mail wurde aktualisiert.')
      router.refresh()
    })
  }

  function onRequestApprovalAgain() {
    startTransition(async () => {
      const result = await requestCustomerApprovalAgainAfterChanges(referenceId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setChangeRequestsDismissed(true)
      if (result.emailMocked) {
        toast.success(
          'Freigabe erneut angefragt — Testmodus: E-Mail nicht gesendet, Ablauf ansonsten abgeschlossen.',
        )
      } else if (result.devRedirected && result.originalRecipientEmail) {
        toast.success(
          `Freigabe erneut angefragt — E-Mail an ${result.recipientEmail} gesendet (Dev-Umleitung von ${result.originalRecipientEmail}).`,
        )
      } else {
        toast.success(
          `Freigabe erneut angefragt — E-Mail an ${result.recipientEmail} gesendet.`,
        )
      }
      router.refresh()
    })
  }

  function onConfirmInternalApprove() {
    const recipient = buildRecipientPayload()
    if (!recipient) {
      toast.error(
        'Bitte E-Mail-Adresse eingeben oder einen Kontakt mit E-Mail auswählen.',
      )
      return
    }
    startTransition(async () => {
      const result = await prepareCustomerApproval(referenceId, recipient)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setDialogOpen(false)
      toast.success(
        'Interne Freigabe bestätigt. Die Kundenmail geht nicht automatisch raus — bitte den Link prüfen und bei Bedarf selbst senden.',
      )
      router.refresh()
    })
  }

  function onCopyApprovalLink() {
    startTransition(async () => {
      const link = await getApprovalLink(referenceId)
      if (!link) {
        toast.error('Noch kein Freigabelink verfügbar.')
        return
      }
      await navigator.clipboard.writeText(link)
      toast.success('Freigabe-Link kopiert.')
    })
  }

  function onOpenApprovalLink() {
    startTransition(async () => {
      const link = await getApprovalLink(referenceId)
      if (!link) {
        toast.error('Noch kein Freigabelink verfügbar.')
        return
      }
      window.open(link, '_blank', 'noopener,noreferrer')
    })
  }

  function onRegenerateLink() {
    startTransition(async () => {
      try {
        await resendClientApprovalEmail(referenceId)
        setRegenerateOpen(false)
        toast.success('Neuer Link ist aktiv. Bitte erneut kopieren und versenden.')
        router.refresh()
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : 'Freigabe-Link konnte nicht erneuert werden.',
        )
      }
    })
  }

  function onWithdraw() {
    startTransition(async () => {
      await withdrawApprovalRequest(referenceId)
      toast.success('Anfrage widerrufen.')
      router.refresh()
    })
  }

  const showCoordinatorEdit =
    canEditCoordinatorEmail && readiness.showWithdraw && !readiness.showMagicLink

  return (
    <>
      {showMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={pending}>
              <AppIcon icon={Shield} size={16} />
              Freigabe
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showStart ? (
              <DropdownMenuItem onSelect={() => onStartSelect()}>
                {startLabel}
              </DropdownMenuItem>
            ) : null}
            {readiness.showMagicLink ? (
              <>
                {showStart ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem onSelect={() => onCopyApprovalLink()}>
                  Freigabe-Link kopieren
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onOpenApprovalLink()}>
                  Freigabe-Seite öffnen
                </DropdownMenuItem>
                {readiness.showRegenerateLink ? (
                  <DropdownMenuItem onSelect={() => setRegenerateOpen(true)}>
                    Neuer Freigabe-Link
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}
            {showRequestApprovalAgain ? (
              <DropdownMenuItem onSelect={() => onRequestApprovalAgain()}>
                Freigabe erneut anfragen
              </DropdownMenuItem>
            ) : null}
            {visibleChangeRequestComment ? (
              <DropdownMenuItem onSelect={() => setChangeCommentOpen(true)}>
                Änderungswünsche anzeigen
              </DropdownMenuItem>
            ) : null}
            {canEditCustomerEmail ? (
              <DropdownMenuItem onSelect={() => openEditRecipientDialog()}>
                Kunden E-Mail ändern
              </DropdownMenuItem>
            ) : null}
            {showCoordinatorEdit ? (
              <DropdownMenuItem onSelect={() => openEditCoordinatorDialog()}>
                Interne Anspr. E-Mail ändern
              </DropdownMenuItem>
            ) : null}
            {readiness.showWithdraw ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onWithdraw()}>
                  Anfrage widerrufen
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <RequestApprovalDialog
        referenceId={referenceId}
        defaultAccountManagerEmail={defaultAccountManagerEmail}
        showTriggerButton={false}
        open={requestOpen}
        onOpenChange={setRequestOpen}
        triggerLabel={startLabel}
      />

      {visibleChangeRequestComment ? (
        <AlertDialog open={changeCommentOpen} onOpenChange={setChangeCommentOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Änderungswünsche des Kunden</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-wrap">
                {visibleChangeRequestComment}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Schließen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <ReferenceReadinessActionDialogs
        pending={pending}
        loadingContacts={loadingContacts}
        contacts={contacts}
        contactQuery={contactQuery}
        setContactQuery={setContactQuery}
        selectedContact={selectedContact}
        setSelectedContact={setSelectedContact}
        canConfirmRecipient={canConfirmRecipient}
        editCoordinatorOpen={editCoordinatorOpen}
        setEditCoordinatorOpen={setEditCoordinatorOpen}
        coordinatorEmail={coordinatorEmail}
        setCoordinatorEmail={setCoordinatorEmail}
        onConfirmEditCoordinator={onConfirmEditCoordinator}
        editRecipientOpen={editRecipientOpen}
        setEditRecipientOpen={setEditRecipientOpen}
        onConfirmEditRecipient={onConfirmEditRecipient}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        onConfirmInternalApprove={onConfirmInternalApprove}
        regenerateOpen={regenerateOpen}
        setRegenerateOpen={setRegenerateOpen}
        onRegenerateLink={onRegenerateLink}
      />
    </>
  )
}
