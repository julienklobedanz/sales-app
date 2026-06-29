'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, LinkIcon, Pencil, Send } from '@hugeicons/core-free-icons'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { ApprovalContactOption } from '@/lib/evidence/approval-contacts'
import type { ApproveInternalRecipientOptions } from '@/lib/evidence/approvals'
import { AppIcon } from '@/lib/icons'
import { canSubmitApprovalRecipient } from '@/lib/references/approval-recipient-input'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { cn } from '@/lib/utils'
import { ApprovalContactSuggestField } from './approval-contact-suggest-field'
import { RequestApprovalDialog } from './request-approval-dialog'
import { ReferenceReadinessShowcaseLinks } from './reference-readiness-showcase-links'

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
  const [selectedContact, setSelectedContact] = useState<ApprovalContactOption | null>(null)

  const canConfirmRecipient = canSubmitApprovalRecipient({
    query: contactQuery,
    selected: selectedContact,
  })

  const showShowcaseSection =
    readiness.phase === 'approved' && Boolean(existingSharePath?.trim())
  const showCreateShareHint =
    readiness.phase === 'approved' && !existingSharePath?.trim()

  const visibleChangeRequestComment =
    !changeRequestsDismissed && customerChangeRequestComment?.trim()
      ? customerChangeRequestComment.trim()
      : null
  const showRequestApprovalAgain =
    hasCustomerChangeRequests && !changeRequestsDismissed

  const showCustomerFollowUpActions =
    readiness.showMagicLink &&
    (showRequestApprovalAgain || canEditCustomerEmail || Boolean(visibleChangeRequestComment))

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
        toast.success('Interne Ansprechperson wurde aktualisiert und per E-Mail informiert.')
      } else {
        toast.success(
          'Interne Ansprechperson wurde aktualisiert. E-Mail-Versand nicht möglich — bitte direkt informieren.'
        )
      }
      router.refresh()
    })
  }

  function onConfirmEditRecipient() {
    const recipient = buildRecipientPayload()
    if (!recipient) {
      toast.error('Bitte E-Mail-Adresse eingeben oder einen Kontakt mit E-Mail auswählen.')
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
          'Freigabe erneut angefragt — Testmodus: E-Mail nicht gesendet, Ablauf ansonsten abgeschlossen.'
        )
      } else if (result.devRedirected && result.originalRecipientEmail) {
        toast.success(
          `Freigabe erneut angefragt — E-Mail an ${result.recipientEmail} gesendet (Dev-Umleitung von ${result.originalRecipientEmail}).`
        )
      } else {
        toast.success(`Freigabe erneut angefragt — E-Mail an ${result.recipientEmail} gesendet.`)
      }
      router.refresh()
    })
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
        toast.error(e instanceof Error ? e.message : 'Freigabe-Link konnte nicht erneuert werden.')
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
    readiness.phase === 'request_approval' && canStartApproval && readiness.showPrimaryStart
  const primaryIsPrepareCustomer =
    readiness.phase === 'prepare_customer' && canInternalApprove && readiness.showPrimaryStart
  const primaryIsWithdrawnRestart =
    readiness.phase === 'withdrawn' && readiness.showPrimaryStart

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
          onClick={openInternalApproveDialog}
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

      {visibleChangeRequestComment ? (
        <div className="w-full max-w-sm space-y-1.5 text-sm">
          <p className="text-muted-foreground">Änderungswünsche des Kunden</p>
          <p className="whitespace-pre-wrap rounded-md border border-amber-200/60 bg-amber-50/50 p-2 text-xs text-amber-950">
            {visibleChangeRequestComment}
          </p>
        </div>
      ) : null}

      {readiness.showMagicLink ? (
        <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5 transition-opacity duration-200">
          <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {readiness.phase === 'pending_customer' ? 'Kunden-Freigabe' : 'Freigabe-Link'}
          </p>
          {showRequestApprovalAgain ? (
            <Button
              type="button"
              variant="default"
              className="w-full gap-2"
              onClick={() => onRequestApprovalAgain()}
              disabled={pending}
            >
              <AppIcon icon={Send} size={16} />
              Freigabe erneut anfragen
            </Button>
          ) : null}
          {canEditCustomerEmail ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={openEditRecipientDialog}
              disabled={pending}
            >
              <AppIcon icon={Pencil} size={16} />
              Kunden E-Mail ändern
            </Button>
          ) : null}
          <Button
            type="button"
            variant={showRequestApprovalAgain ? 'outline' : 'default'}
            className="w-full gap-2"
            onClick={() => onCopyApprovalLink()}
            disabled={pending}
          >
            <AppIcon icon={LinkIcon} size={16} />
            Freigabe-Link kopieren
          </Button>
          {readiness.showRegenerateLink ? (
            <div className="flex w-full">
              <Button
                type="button"
                variant="outline"
                className="min-w-0 flex-1 gap-2 rounded-r-none"
                onClick={() => void onOpenApprovalLink()}
                disabled={pending}
              >
                <AppIcon icon={ExternalLink} size={16} />
                Freigabe-Seite öffnen
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 rounded-l-none border-l-0 px-2.5"
                    disabled={pending}
                    aria-label="Weitere Freigabe-Aktionen"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setRegenerateOpen(true)}>
                    Neuer Freigabe-Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => void onOpenApprovalLink()}
              disabled={pending}
            >
              <AppIcon icon={ExternalLink} size={16} />
              Freigabe-Seite öffnen
            </Button>
          )}
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

      {showShowcaseSection && existingSharePath ? (
        <ReferenceReadinessShowcaseLinks
          referenceId={referenceId}
          publicPreviewPath={existingSharePath}
        />
      ) : null}

      {showCreateShareHint ? (
        <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
          Für die Kunden-Showcase-Ansicht zuerst unter{' '}
          <span className="font-medium text-foreground">Aktionen → Teilen</span> einen Kundenlink anlegen.
        </p>
      ) : null}

      {showWorkflowRerouteActions ? (
        <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5 transition-opacity duration-200">
          {canEditCoordinatorEmail ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={openEditCoordinatorDialog}
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
              onClick={openEditRecipientDialog}
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

      {readiness.showWithdraw && !readiness.showMagicLink && !showWorkflowRerouteActions ? (
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

      <Dialog open={editCoordinatorOpen} onOpenChange={setEditCoordinatorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Interne Ansprechperson ändern</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die neue Person erhält eine E-Mail mit einem Link zur internen Freigabe. Der bisherige
            interne Freigabe-Link verliert seine Gültigkeit.
          </p>
          <div className="grid gap-2 py-2">
            <Label htmlFor="edit-coordinator-email">E-Mail des Account Managers</Label>
            <Input
              id="edit-coordinator-email"
              type="email"
              value={coordinatorEmail}
              onChange={(e) => setCoordinatorEmail(e.target.value)}
              placeholder="name@firma.de"
              disabled={pending}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditCoordinatorOpen(false)}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={onConfirmEditCoordinator}
              disabled={pending || !isApprovalRecipientEmail(coordinatorEmail.trim())}
            >
              Speichern &amp; informieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editRecipientOpen} onOpenChange={setEditRecipientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kunden E-Mail ändern</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Der neue Kontakt erhält künftige Freigabe-E-Mails. Der Freigebende Kunde wird aus der
            E-Mail-Adresse abgeleitet. Eine bestehende Delegation wird zurückgesetzt.
          </p>
          <div className="grid gap-2 py-2">
            <Label htmlFor="edit-approval-recipient">Kontakt (Name oder E-Mail)</Label>
            <ApprovalContactSuggestField
              id="edit-approval-recipient"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditRecipientOpen(false)}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={onConfirmEditRecipient}
              disabled={pending || loadingContacts || !canConfirmRecipient}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Kundenfreigabe vorbereiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuen Freigabelink erzeugen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der bisherige Link verliert damit seine Gültigkeit und die Kundenfreigabe wird auf
              „ausstehend“ zurückgesetzt. Bitte senden Sie den neuen Magic Link erneut an den Kunden.
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
