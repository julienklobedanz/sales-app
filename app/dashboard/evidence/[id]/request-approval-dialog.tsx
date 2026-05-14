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

function RequiredMark() {
  return <span className="text-destructive"> *</span>
}

export function RequestApprovalDialog({
  referenceId,
  defaultInternalOwnerName,
  triggerIcon,
}: {
  referenceId: string
  /** Vorausfüllung (Referenz oder Profil); Feld bleibt Pflicht. */
  defaultInternalOwnerName?: string | null
  triggerIcon?: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setOwnerName((defaultInternalOwnerName ?? '').trim())
    setMessage('')
  }, [open, defaultInternalOwnerName])

  async function onSubmit() {
    if (!ownerName.trim()) {
      toast.error('Bitte einen internen Verantwortlichen bei der Freigabe angeben.')
      return
    }

    const options: SubmitForApprovalOptions = {
      ownerName: ownerName.trim(),
    }
    if (message.trim()) options.message = message.trim()

    setLoading(true)
    try {
      const result = await submitForApproval(referenceId, options)
      if ((result as { stage?: string } | null)?.stage === 'internal_review_pending') {
        toast.success(
          'Zur internen Prüfung eingereicht. Der Account Manager übernimmt den Kundenkontakt — es geht kein automatischer Kundenversand raus.'
        )
      } else {
        toast.success('Freigabe angefordert.')
      }
      setOpen(false)
      setMessage('')
      setOwnerName('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Freigabe konnte nicht angefordert werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        {triggerIcon ? <span className="mr-2 inline-flex items-center">{triggerIcon}</span> : null}
        Freigabe anfordern
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Freigabe anfordern</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
            Kontakt beim Kunden, Referenz-Geber, Ablauf des Freigabe-Links, Wettbewerber-Ausschluss und Zitat sind in
            der Referenz bzw. unter Einstellungen (Freigabe-Workflow) hinterlegt — hier nicht erneut erfassen.
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
                Pflichtfeld. Wird intern und in Benachrichtigungen genutzt (z. B. wenn der Salesforce-Owner noch
                nicht angebunden ist).
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-msg">Nachricht an den Account Manager (optional)</Label>
              <Textarea
                id="approval-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Kontext zur Freigabe, Dringlichkeit, Besonderheiten …"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Sichtbar im Freigabe-Kontext für euer Team; der Kundenkontakt erhält sie nicht automatisch als
                separaten Textbaustein.
              </p>
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
