'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, LinkIcon } from '@hugeicons/core-free-icons'
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
import { ReferenceReadinessShowcaseLinks } from './reference-readiness-showcase-links'

type Props = {
  referenceId: string
  readiness: ReferenceReadinessState
  /** Aktiver Kundenlink (/p/slug), falls vorhanden */
  existingSharePath: string | null
  canStartApproval: boolean
  canInternalApprove: boolean
  defaultInternalOwnerName?: string | null
  defaultAccountManagerEmail?: string | null
  autoOpenApprovalDialog?: boolean
  approvalContactId: string | null
  approvalExternalContactId: string | null
  referenceContactId: string | null
  referenceCustomerContactId: string | null
}

export function ReferenceReadinessActions({
  referenceId,
  readiness,
  existingSharePath,
  canStartApproval,
  canInternalApprove,
  defaultInternalOwnerName,
  defaultAccountManagerEmail,
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

  const showShowcaseSection =
    readiness.phase === 'approved' && Boolean(existingSharePath?.trim())
  const showCreateShareHint =
    readiness.phase === 'approved' && !existingSharePath?.trim()

  const showActions =
    readiness.showPrimaryStart ||
    readiness.showMagicLink ||
    readiness.showRegenerateLink ||
    readiness.showWithdraw ||
    showShowcaseSection ||
    showCreateShareHint

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
            defaultInternalOwnerName={defaultInternalOwnerName}
            defaultAccountManagerEmail={defaultAccountManagerEmail}
            triggerId="reference-readiness-approval-trigger"
            triggerVariant="default"
            triggerClassName="w-full"
            triggerLabel="Freigabe starten"
            autoOpen={autoOpenApprovalDialog}
          />
        </div>
      ) : null}

      {readiness.phase === 'internal_start' && !canInternalApprove ? (
        <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
          Interne Prüfung ausstehend — der Account Manager bereitet die Kundenfreigabe vor.
        </p>
      ) : null}

      {primaryIsInternal ? (
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
        canInternalApprove ? (
          <Button
            type="button"
            variant="default"
            className="w-full max-w-sm transition-opacity duration-200"
            onClick={openInternalApproveDialog}
            disabled={pending}
          >
            Freigabe erneut starten
          </Button>
        ) : (
          <div className="w-full max-w-sm transition-opacity duration-200">
            <RequestApprovalDialog
              referenceId={referenceId}
              defaultInternalOwnerName={defaultInternalOwnerName}
              defaultAccountManagerEmail={defaultAccountManagerEmail}
              triggerId="reference-readiness-withdrawn-restart-trigger"
              triggerVariant="default"
              triggerClassName="w-full"
              triggerLabel="Freigabe erneut starten"
            />
          </div>
        )
      ) : null}

      {readiness.showMagicLink ? (
        <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5 transition-opacity duration-200">
          <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {readiness.phase === 'pending_customer' ? 'Kunden-Freigabe' : 'Freigabe-Link'}
          </p>
          <Button
            type="button"
            variant="default"
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
