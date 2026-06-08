'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitForApproval } from '@/app/dashboard/actions'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'

function RequiredMark() {
  return <span className="text-destructive"> *</span>
}

export function RequestApprovalDialog({
  referenceId,
  defaultInternalOwnerName,
  defaultAccountManagerEmail,
  triggerIcon,
  triggerId,
  triggerVariant = 'outline',
  triggerClassName = 'w-full',
  triggerLabel = 'Freigabe anfordern',
  autoOpen = false,
}: {
  referenceId: string
  /** Vorausfüllung (Referenz oder Profil); Feld bleibt Pflicht. */
  defaultInternalOwnerName?: string | null
  /** Vorausfüllung aus Account-Metadaten, falls hinterlegt */
  defaultAccountManagerEmail?: string | null
  triggerIcon?: ReactNode
  triggerId?: string
  triggerVariant?: 'default' | 'outline'
  triggerClassName?: string
  triggerLabel?: string
  autoOpen?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [accountManagerEmail, setAccountManagerEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setOwnerName((defaultInternalOwnerName ?? '').trim())
    setAccountManagerEmail((defaultAccountManagerEmail ?? '').trim())
    setMessage('')
  }, [open, defaultInternalOwnerName, defaultAccountManagerEmail])

  useEffect(() => {
    if (!autoOpen) return
    setOpen(true)
  }, [autoOpen])

  async function onSubmit() {
    if (!ownerName.trim()) {
      toast.error('Bitte einen internen Verantwortlichen bei der Freigabe angeben.')
      return
    }

    const emailTrimmed = accountManagerEmail.trim()
    if (emailTrimmed && !isApprovalRecipientEmail(emailTrimmed)) {
      toast.error('Bitte eine gültige E-Mail-Adresse für den Account Manager eingeben.')
      return
    }

    const options: SubmitForApprovalOptions = {
      ownerName: ownerName.trim(),
    }
    if (emailTrimmed) options.accountManagerEmail = emailTrimmed
    if (message.trim()) options.message = message.trim()

    setLoading(true)
    try {
      await submitForApproval(referenceId, options)
      toast.success(
        'Zur internen Prüfung eingereicht. Der Account Manager wurde per E-Mail benachrichtigt.'
      )
      setOpen(false)
      setMessage('')
      setOwnerName('')
      setAccountManagerEmail('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Freigabe konnte nicht angefordert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        id={triggerId}
        type="button"
        variant={triggerVariant}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerIcon ? <span className="mr-2 inline-flex items-center">{triggerIcon}</span> : null}
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Freigabe anfordern</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 p-3 text-xs leading-relaxed text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100">
            <p className="font-medium">Anfrage an den Account Manager — nicht an den Kunden.</p>
            <p className="mt-1 text-sky-900/90 dark:text-sky-100/85">
              Sales reicht hier zur internen Prüfung ein. Der Account Manager wählt später den
              Kundenkontakt und sendet den Freigabe-Link. Zitat, Scope und Ablauf bleiben in der
              Referenz bzw. unter Einstellungen hinterlegt.
            </p>
          </div>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="approval-owner">
                Interner Verantwortlicher bei der Freigabe
                <RequiredMark />
              </Label>
              <Input
                id="approval-owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Name der Person, die intern die Freigabe koordiniert"
                disabled={loading}
                required
                autoComplete="name"
              />
              <p className="text-xs text-muted-foreground">
                Name des Sales-Verantwortlichen — wird intern gespeichert und in der Benachrichtigung
                genannt.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-am-email">E-Mail des Account Managers</Label>
              <Input
                id="approval-am-email"
                type="email"
                value={accountManagerEmail}
                onChange={(e) => setAccountManagerEmail(e.target.value)}
                placeholder="account.manager@firma.de"
                disabled={loading}
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">
                Optional, aber empfohlen: Empfänger der Benachrichtigung. Ohne Angabe wird der am
                Account hinterlegte Freigabe-Kontakt verwendet (falls vorhanden).
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-msg">Nachricht an den Account Manager (optional)</Label>
              <Textarea
                id="approval-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Kontext zur Freigabe, Dringlichkeit, Besonderheiten …"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void onSubmit()} disabled={loading}>
              Anfrage senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
