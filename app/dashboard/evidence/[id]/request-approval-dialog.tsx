'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { getContactOptionsForReference, submitForApproval } from '@/app/dashboard/actions'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'

export function RequestApprovalDialog({
  referenceId,
  defaultContactId,
}: {
  referenceId: string
  defaultContactId?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<{ id: string; label: string }[]>([])
  const [contactId, setContactId] = useState<string>('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingContacts(true)
    void getContactOptionsForReference(referenceId).then((res) => {
      if (cancelled) return
      setLoadingContacts(false)
      if (res.error) {
        toast.error(res.error)
        setContacts([])
        return
      }
      const opts = res.contacts.map((c) => ({ id: c.id, label: c.label }))
      setContacts(opts)
      const def = defaultContactId && opts.some((o) => o.id === defaultContactId)
      if (def) {
        setContactId(defaultContactId)
      } else if (opts.length === 1) {
        setContactId(opts[0].id)
      } else {
        setContactId('')
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, referenceId, defaultContactId])

  async function onSubmit() {
    const options: SubmitForApprovalOptions = {}
    if (message.trim()) options.message = message.trim()
    if (contactId) options.contactId = contactId

    setLoading(true)
    try {
      await submitForApproval(referenceId, options)
      toast.success('Freigabe angefordert. E-Mail wurde versendet.')
      setOpen(false)
      setMessage('')
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
        Freigabe anfordern
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Freigabe per E-Mail anfordern</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="approval-contact">Kontakt beim Kunden</Label>
              <Select
                value={contactId || undefined}
                onValueChange={setContactId}
                disabled={loadingContacts || contacts.length === 0}
              >
                <SelectTrigger id="approval-contact" className="w-full">
                  <SelectValue
                    placeholder={
                      loadingContacts
                        ? 'Kontakte werden geladen …'
                        : contacts.length
                          ? 'Kontakt wählen'
                          : 'Keine Kontakte am Account'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ohne Auswahl wird der in der Referenz hinterlegte Kundenkontakt verwendet, sofern vorhanden.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approval-msg">Nachricht (optional)</Label>
              <Textarea
                id="approval-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Kurzer Kontext für den Empfänger …"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void onSubmit()} disabled={loading || loadingContacts}>
              Senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
