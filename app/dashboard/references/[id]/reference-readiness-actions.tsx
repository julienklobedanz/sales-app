'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  approveInternalAndSend,
  getApprovalLink,
  getContactOptionsForReference,
  requestCustomerApprovalAgainAfterChanges,
  resendClientApprovalEmail,
  updateApprovalCoordinator,
  updateApprovalRecipient,
  withdrawApprovalRequest,
} from '@/app/dashboard/actions'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'
import type { ApprovalContactOption } from '@/lib/references/library/approval-contacts'
import type { ApproveInternalRecipientOptions } from '@/lib/references/library/approvals'
import { canSubmitApprovalRecipient } from '@/lib/references/approval-recipient-input'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { cn } from '@/lib/utils'
import { ReferenceReadinessShowcaseLinks } from './reference-readiness-showcase-links'
import { ReferenceReadinessActionDialogs } from './reference-readiness/reference-readiness-action-dialogs'
import { ReferenceReadinessMagicLinkPanel } from './reference-readiness/reference-readiness-magic-link-panel'
import {
  ReferenceReadinessPrimaryActions,
  ReferenceReadinessWorkflowReroute,
} from './reference-readiness/reference-readiness-primary-actions'

type Props = {
  referenceId: string
  readiness: ReferenceReadinessState
  /** Aktiver Kundenlink (/p/slug), falls vorhanden */
  existingSharePath: string | null
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
  existingSharePath,
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecipientOpen, setEditRecipientOpen] = useState(false)
  const [editCoordinatorOpen, setEditCoordinatorOpen] = useState(false)
  const [coordinatorEmail, setCoordinatorEmail] = useState('')
  const [regenerateOpen, setRegenerateOpen] = useState(false)
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

  const showShowcaseSection =
    readiness.phase === 'approved' && Boolean(existingSharePath?.trim())
  const showCreateShareHint = readiness.phase === 'approved' && !existingSharePath?.trim()

  const visibleChangeRequestComment =
    !changeRequestsDismissed && customerChangeRequestComment?.trim()
      ? customerChangeRequestComment.trim()
      : null
  const showRequestApprovalAgain = hasCustomerChangeRequests && !changeRequestsDismissed

  const showCustomerFollowUpActions =
    readiness.showMagicLink &&
    (showRequestApprovalAgain ||
      canEditCustomerEmail ||
      Boolean(visibleChangeRequestComment))

  const showWorkflowRerouteActions =
    readiness.showWithdraw &&
    (canEditCustomerEmail || canEditCoordinatorEmail) &&
    !readiness.showMagicLink

  const showActions =
    readiness.showPrimaryStart ||
    readiness.showMagicLink ||
    readiness.showRegenerateLink ||
    readiness.showWithdraw ||
    showShowcaseSection ||
    showCreateShareHint ||
    showCustomerFollowUpActions ||
    showWorkflowRerouteActions

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

  function openEditRecipientDialog() {
    setEditRecipientOpen(true)
    void loadContactsForDialog()
  }

  function openEditCoordinatorDialog() {
    setCoordinatorEmail('')
    setEditCoordinatorOpen(true)
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
      const result = await approveInternalAndSend(referenceId, recipient)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setDialogOpen(false)
      if (result.customerEmailSent) {
        toast.success(
          `Freigabe-Anfrage mit Magic Link wurde an ${result.recipientEmail} gesendet.`,
        )
      } else {
        toast.success(
          'Kundenfreigabe vorbereitet. E-Mail-Versand nicht möglich — Freigabe-Link kopieren und manuell senden.',
        )
      }
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

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center gap-3 border-t border-border/60 pt-4 transition-all duration-200 ease-out',
        !showActions && readiness.showStaleHint && 'border-t-0 pt-0',
      )}
    >
      {readiness.showStaleHint ? (
        <p className="max-w-full text-center text-xs text-muted-foreground leading-relaxed">
          Referenz ist einsatzbereit — Freigabe-Schritte abgeschlossen.
        </p>
      ) : null}

      <ReferenceReadinessPrimaryActions
        referenceId={referenceId}
        readiness={readiness}
        pending={pending}
        canInternalApprove={canInternalApprove}
        defaultAccountManagerEmail={defaultAccountManagerEmail}
        autoOpenApprovalDialog={autoOpenApprovalDialog}
        primaryIsRequest={primaryIsRequest}
        primaryIsPrepareCustomer={primaryIsPrepareCustomer}
        primaryIsWithdrawnRestart={primaryIsWithdrawnRestart}
        onPrepareCustomer={openInternalApproveDialog}
      />

      {visibleChangeRequestComment ? (
        <div className="w-full max-w-sm space-y-1.5 text-sm">
          <p className="text-muted-foreground">Änderungswünsche des Kunden</p>
          <p className="whitespace-pre-wrap rounded-md border border-amber-200/60 bg-amber-50/50 p-2 text-xs text-amber-950">
            {visibleChangeRequestComment}
          </p>
        </div>
      ) : null}

      <ReferenceReadinessMagicLinkPanel
        readiness={readiness}
        pending={pending}
        showRequestApprovalAgain={showRequestApprovalAgain}
        canEditCustomerEmail={canEditCustomerEmail}
        onRequestApprovalAgain={onRequestApprovalAgain}
        onOpenEditRecipient={openEditRecipientDialog}
        onCopyApprovalLink={onCopyApprovalLink}
        onOpenApprovalLink={onOpenApprovalLink}
        onOpenRegenerate={() => setRegenerateOpen(true)}
        onWithdraw={onWithdraw}
      />

      {showShowcaseSection && existingSharePath ? (
        <ReferenceReadinessShowcaseLinks
          referenceId={referenceId}
          publicPreviewPath={existingSharePath}
        />
      ) : null}

      {showCreateShareHint ? (
        <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
          Für die Kunden-Showcase-Ansicht zuerst unter{' '}
          <span className="font-medium text-foreground">Aktionen → Teilen</span> einen
          Kundenlink anlegen.
        </p>
      ) : null}

      <ReferenceReadinessWorkflowReroute
        readiness={readiness}
        pending={pending}
        showWorkflowRerouteActions={showWorkflowRerouteActions}
        canEditCoordinatorEmail={canEditCoordinatorEmail}
        canEditCustomerEmail={canEditCustomerEmail}
        onOpenEditCoordinator={openEditCoordinatorDialog}
        onOpenEditRecipient={openEditRecipientDialog}
        onWithdraw={onWithdraw}
      />

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
    </div>
  )
}
