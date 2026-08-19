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
import { Hinweis } from '@/components/ui/hinweis'
import { submitForApproval } from '@/app/dashboard/actions'
import type { SubmitForApprovalOptions } from '@/lib/references/library/approval-submit-types'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'

function RequiredMark() {
  return <span className="text-destructive"> *</span>
}

export function RequestApprovalDialog({
  referenceId,
  defaultAccountManagerEmail,
  triggerIcon,
  triggerId,
  triggerVariant = 'outline',
  triggerClassName = 'w-full',
  triggerLabel = 'Freigabe anfordern',
  autoOpen = false,
  showTriggerButton = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  referenceId: string
  /** Vorausfüllung aus Account-Metadaten, falls hinterlegt */
  defaultAccountManagerEmail?: string | null
  triggerIcon?: ReactNode
  triggerId?: string
  triggerVariant?: 'default' | 'outline'
  triggerClassName?: string
  triggerLabel?: string
  autoOpen?: boolean
  showTriggerButton?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(autoOpen)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  function setOpen(next: boolean) {
    if (controlledOnOpenChange) controlledOnOpenChange(next)
    if (controlledOpen === undefined) setInternalOpen(next)
  }
  const [loading, setLoading] = useState(false)
  const [accountManagerEmail, setAccountManagerEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setAccountManagerEmail((defaultAccountManagerEmail ?? '').trim())
    setMessage('')
  }, [open, defaultAccountManagerEmail])

  async function onSubmit() {
    const emailTrimmed = accountManagerEmail.trim()
    if (!emailTrimmed) {
      toast.error('Bitte die E-Mail des Account Managers angeben.')
      return
    }
    if (!isApprovalRecipientEmail(emailTrimmed)) {
      toast.error('Bitte eine gültige E-Mail-Adresse für den Account Manager eingeben.')
      return
    }

    const options: SubmitForApprovalOptions = {
      accountManagerEmail: emailTrimmed,
    }
    if (message.trim()) options.message = message.trim()

    setLoading(true)
    try {
      await submitForApproval(referenceId, options)
      toast.success(
        'Zur internen Prüfung eingereicht. Der Account Manager wurde per E-Mail benachrichtigt.',
      )
      setOpen(false)
      setMessage('')
      setAccountManagerEmail('')
      router.refresh()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Freigabe konnte nicht angefordert werden.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showTriggerButton ? (
        <Button
          id={triggerId}
          type="button"
          variant={triggerVariant}
          className={triggerClassName}
          onClick={() => setOpen(true)}
        >
          {triggerIcon ? (
            <span className="mr-2 inline-flex items-center">{triggerIcon}</span>
          ) : null}
          {triggerLabel}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Freigabe anfordern</DialogTitle>
          </DialogHeader>
          <Hinweis tone="muted" className="p-3 leading-relaxed">
            <p className="font-medium">Interne Prüfung beim Account Manager anstoßen</p>
            <p className="mt-1">
              Mit dieser Anfrage leiten Sie die Referenz zur internen Prüfung weiter —
              nicht direkt an den Kunden. Der Account Manager erhält eine E-Mail, prüft
              die Referenz und bereitet danach die Kundenfreigabe vor (Kontaktwahl und
              Versand des Freigabe-Links). Scope, Zitat und Fristen sind an der Referenz
              bzw. in den Einstellungen hinterlegt.
            </p>
          </Hinweis>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="approval-am-email">
                E-Mail des Account Managers
                <RequiredMark />
              </Label>
              <Input
                id="approval-am-email"
                type="email"
                value={accountManagerEmail}
                onChange={(e) => setAccountManagerEmail(e.target.value)}
                placeholder="account.manager@firma.de"
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-msg">
                Nachricht an den Account Manager (optional)
              </Label>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
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
