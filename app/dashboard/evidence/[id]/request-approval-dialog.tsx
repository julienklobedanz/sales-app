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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { getContactOptionsForReference, submitForApproval } from '@/app/dashboard/actions'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'

export function RequestApprovalDialog({
  referenceId,
  defaultContactId,
  triggerIcon,
}: {
  referenceId: string
  defaultContactId?: string | null
  triggerIcon?: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState<{ id: string; label: string }[]>([])
  const [contactId, setContactId] = useState<string>('')
  const [step, setStep] = useState<1 | 2>(1)
  const [ownerName, setOwnerName] = useState('')
  const [referenceGiverName, setReferenceGiverName] = useState('')
  const [referenceGiverTitle, setReferenceGiverTitle] = useState('')
  const [competitorBlacklist, setCompetitorBlacklist] = useState('')
  const [proposedQuote, setProposedQuote] = useState('')
  const [expiryDays, setExpiryDays] = useState('14')
  const [allowNamed, setAllowNamed] = useState(true)
  const [allowAnonymous, setAllowAnonymous] = useState(true)
  const [allowReferenceCall, setAllowReferenceCall] = useState(false)
  const [allowLogoUse, setAllowLogoUse] = useState(false)
  const [allowPressRelease, setAllowPressRelease] = useState(false)
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
    if (ownerName.trim()) options.ownerName = ownerName.trim()
    if (referenceGiverName.trim()) options.referenceGiverName = referenceGiverName.trim()
    if (referenceGiverTitle.trim()) options.referenceGiverTitle = referenceGiverTitle.trim()
    if (proposedQuote.trim()) options.proposedQuote = proposedQuote.trim()
    if (competitorBlacklist.trim()) {
      options.competitorBlacklist = competitorBlacklist
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    }
    const parsedDays = Number(expiryDays)
    if (Number.isFinite(parsedDays)) {
      options.approvalExpiresInDays = Math.max(1, Math.min(365, Math.trunc(parsedDays)))
    }
    options.scope = {
      namedMention: allowNamed,
      anonymousMention: allowAnonymous,
      referenceCall: allowReferenceCall,
      logoUse: allowLogoUse,
      pressRelease: allowPressRelease,
    }

    setLoading(true)
    try {
      const result = await submitForApproval(referenceId, options)
      if ((result as { stage?: string } | null)?.stage === 'internal_review_pending') {
        toast.success('Zur internen Prüfung eingereicht. Versand erfolgt nach Vier-Augen-Freigabe.')
      } else {
        toast.success('Freigabe angefordert. E-Mail wurde versendet.')
      }
      setOpen(false)
      setStep(1)
      setMessage('')
      setOwnerName('')
      setReferenceGiverName('')
      setReferenceGiverTitle('')
      setCompetitorBlacklist('')
      setProposedQuote('')
      setExpiryDays('14')
      setAllowNamed(true)
      setAllowAnonymous(true)
      setAllowReferenceCall(false)
      setAllowLogoUse(false)
      setAllowPressRelease(false)
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
          <div className="mb-1 mt-2 flex items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 ${step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              1. Empfänger & Scope
            </span>
            <span className={`rounded-full px-2 py-1 ${step === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              2. Nachricht & Versand
            </span>
          </div>
          {step === 1 ? (
            <div className="grid gap-5 py-2">
              <div className="grid gap-2">
                <Label htmlFor="approval-owner">Interner Verantwortlicher</Label>
                <Input
                  id="approval-owner"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="z. B. Max Mustermann (optional)"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Falls Salesforce-Owner noch nicht angebunden ist, hier manuell setzen.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="approval-giver-name">Offizieller Referenz-Geber (Name)</Label>
                  <Input
                    id="approval-giver-name"
                    value={referenceGiverName}
                    onChange={(e) => setReferenceGiverName(e.target.value)}
                    placeholder="z. B. CIO Name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="approval-giver-title">Referenz-Geber (Position)</Label>
                  <Input
                    id="approval-giver-title"
                    value={referenceGiverTitle}
                    onChange={(e) => setReferenceGiverTitle(e.target.value)}
                    placeholder="z. B. CIO"
                  />
                </div>
              </div>
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
                <Label>Freigabe-Umfang</Label>
                <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allowNamed} onCheckedChange={(v) => setAllowNamed(v === true)} />
                    Namentliche Nennung
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allowAnonymous} onCheckedChange={(v) => setAllowAnonymous(v === true)} />
                    Anonyme Nennung
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allowReferenceCall} onCheckedChange={(v) => setAllowReferenceCall(v === true)} />
                    Referenz-Call
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allowLogoUse} onCheckedChange={(v) => setAllowLogoUse(v === true)} />
                    Logo-Nutzung
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Checkbox checked={allowPressRelease} onCheckedChange={(v) => setAllowPressRelease(v === true)} />
                    Pressemeldung / Öffentliches Zitat
                  </label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="approval-expiry">Ablauf des Freigabe-Links (Tage)</Label>
                <Input
                  id="approval-expiry"
                  value={expiryDays}
                  inputMode="numeric"
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="14"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="approval-blacklist">Wettbewerber-Ausschlussliste</Label>
                <Input
                  id="approval-blacklist"
                  value={competitorBlacklist}
                  onChange={(e) => setCompetitorBlacklist(e.target.value)}
                  placeholder="z. B. SAP, Oracle, Accenture"
                />
                <p className="text-xs text-muted-foreground">Kommagetrennt; Referenz wird für diese Accounts gesperrt.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="approval-quote">Zitatvorschlag (optional)</Label>
                <Textarea
                  id="approval-quote"
                  value={proposedQuote}
                  onChange={(e) => setProposedQuote(e.target.value)}
                  rows={3}
                  placeholder="Vorgeschlagenes Kundenzitat …"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-5 py-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                E-Mail-Vorschau: Der Empfänger erhält einen sicheren Link zur Freigabe ohne Login.
              </div>
              <div className="grid gap-2">
                <Label htmlFor="approval-msg">Nachricht (optional)</Label>
                <Textarea
                  id="approval-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Kurzer Kontext für den Empfänger …"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Scope, Verantwortlicher und Ablauf werden automatisch in die Anfrage übernommen.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={() => setStep(2)} disabled={loading || loadingContacts}>
                  Weiter
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  Zurück
                </Button>
                <Button type="button" onClick={() => void onSubmit()} disabled={loading || loadingContacts}>
                  Anfrage senden
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
