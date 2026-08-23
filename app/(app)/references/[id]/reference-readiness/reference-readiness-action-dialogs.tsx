'use client'

import type { Dispatch, SetStateAction } from 'react'

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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'
import type { ApprovalContactOption } from '@/lib/references/library/approval-contacts'
import { ApprovalContactSuggestField } from '../approval-contact-suggest-field'

export function ReferenceReadinessActionDialogs({
  pending,
  loadingContacts,
  contacts,
  contactQuery,
  setContactQuery,
  selectedContact,
  setSelectedContact,
  canConfirmRecipient,
  editCoordinatorOpen,
  setEditCoordinatorOpen,
  coordinatorEmail,
  setCoordinatorEmail,
  onConfirmEditCoordinator,
  editRecipientOpen,
  setEditRecipientOpen,
  onConfirmEditRecipient,
  dialogOpen,
  setDialogOpen,
  onConfirmInternalApprove,
  regenerateOpen,
  setRegenerateOpen,
  onRegenerateLink,
}: {
  pending: boolean
  loadingContacts: boolean
  contacts: ApprovalContactOption[]
  contactQuery: string
  setContactQuery: Dispatch<SetStateAction<string>>
  selectedContact: ApprovalContactOption | null
  setSelectedContact: Dispatch<SetStateAction<ApprovalContactOption | null>>
  canConfirmRecipient: boolean
  editCoordinatorOpen: boolean
  setEditCoordinatorOpen: Dispatch<SetStateAction<boolean>>
  coordinatorEmail: string
  setCoordinatorEmail: Dispatch<SetStateAction<string>>
  onConfirmEditCoordinator: () => void
  editRecipientOpen: boolean
  setEditRecipientOpen: Dispatch<SetStateAction<boolean>>
  onConfirmEditRecipient: () => void
  dialogOpen: boolean
  setDialogOpen: Dispatch<SetStateAction<boolean>>
  onConfirmInternalApprove: () => void
  regenerateOpen: boolean
  setRegenerateOpen: Dispatch<SetStateAction<boolean>>
  onRegenerateLink: () => void
}) {
  return (
    <>
      <Dialog open={editCoordinatorOpen} onOpenChange={setEditCoordinatorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Interne Ansprechperson ändern</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die neue Person erhält eine E-Mail mit einem Link zur internen Freigabe. Der
            bisherige interne Freigabe-Link verliert seine Gültigkeit.
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
            Der neue Kontakt erhält künftige Freigabe-E-Mails. Der Freigebende Kunde wird
            aus der E-Mail-Adresse abgeleitet. Eine bestehende Delegation wird
            zurückgesetzt.
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
            Es wird kein automatischer E-Mail-Versand ausgelöst. Der Kontakt wird
            gespeichert; den Freigabe-Link kopieren Sie anschließend und senden ihn
            manuell. Unbekannte E-Mail-Adressen werden als Kundenkontakt angelegt.
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
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
              Der bisherige Link verliert damit seine Gültigkeit und die Kundenfreigabe
              wird auf „ausstehend“ zurückgesetzt. Bitte senden Sie den neuen Magic Link
              erneut an den Kunden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={onRegenerateLink}>
              Neuen Link erzeugen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
