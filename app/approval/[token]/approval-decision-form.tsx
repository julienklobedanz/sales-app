'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckIcon } from '@/components/ui/check-icon'
import { AppIcon } from '@/lib/icons'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { completeClientApproval, delegateClientApproval } from './actions'
import { Input } from '@/components/ui/input'

export function ApprovalDecisionForm({
  token,
  referenceTitle,
}: {
  token: string
  referenceTitle: string
}) {
  const [comment, setComment] = useState('')
  const [approvedQuote, setApprovedQuote] = useState('')
  const [referenceGiverName, setReferenceGiverName] = useState('')
  const [referenceGiverTitle, setReferenceGiverTitle] = useState('')
  const [delegateName, setDelegateName] = useState('')
  const [delegateEmail, setDelegateEmail] = useState('')
  const [consentFileUrl, setConsentFileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  async function submit(decision: 'approved' | 'rejected') {
    setLoading(true)
    try {
      const result = await completeClientApproval({
        token,
        decision,
        comment: comment.trim() || undefined,
        approvedQuote: approvedQuote.trim() || undefined,
        referenceGiverName: referenceGiverName.trim() || undefined,
        referenceGiverTitle: referenceGiverTitle.trim() || undefined,
        consentFileUrl: consentFileUrl.trim() || undefined,
      })
      if (!result.success) {
        if (result.error === 'already_decided') {
          toast.error('Diese Freigabe wurde bereits bearbeitet.')
        } else if (result.error === 'invalid_token') {
          toast.error('Dieser Link ist nicht mehr gültig.')
        } else {
          toast.error('Die Entscheidung konnte nicht gespeichert werden.')
        }
        return
      }
      setDone(decision)
    } catch {
      toast.error('Die Entscheidung konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  async function onConsentFileChange(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = typeof reader.result === 'string' ? reader.result : ''
      setConsentFileUrl(data)
      toast.success('Consent-Dokument angehängt.')
    }
    reader.onerror = () => toast.error('Datei konnte nicht gelesen werden.')
    reader.readAsDataURL(file)
  }

  async function onDelegate() {
    if (!delegateEmail.trim()) {
      toast.error('Bitte E-Mail für Delegation eingeben.')
      return
    }
    setLoading(true)
    try {
      const res = await delegateClientApproval({
        token,
        delegateName: delegateName.trim() || undefined,
        delegateEmail: delegateEmail.trim(),
      })
      if (!res.success) {
        toast.error('Delegation fehlgeschlagen.')
        return
      }
      toast.success('Delegation gespeichert. Link kann an Kollegen weitergeleitet werden.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">
          {done === 'approved'
            ? 'Vielen Dank — die Referenz wurde freigegeben.'
            : 'Vielen Dank — die Referenz wurde abgelehnt.'}
        </p>
        <p className="text-sm text-muted-foreground">
          Sie können dieses Fenster schließen. Der Ansprechpartner bei uns wurde informiert.
        </p>
        <p className="text-xs text-muted-foreground pt-2">{referenceTitle}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="approval-comment">Ihr Kommentar (optional)</Label>
        <Textarea
          id="approval-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Anmerkungen zur Freigabe …"
          className="resize-y min-h-[100px]"
          disabled={loading}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reference-giver-name">Offizieller Referenz-Geber (Name)</Label>
          <Input id="reference-giver-name" value={referenceGiverName} onChange={(e) => setReferenceGiverName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference-giver-title">Referenz-Geber (Position)</Label>
          <Input id="reference-giver-title" value={referenceGiverTitle} onChange={(e) => setReferenceGiverTitle(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="approved-quote">Freigegebenes Zitat (optional)</Label>
        <Textarea
          id="approved-quote"
          value={approvedQuote}
          onChange={(e) => setApprovedQuote(e.target.value)}
          rows={3}
          placeholder="Zitat freigeben oder anpassen …"
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="consent-upload">Unterschriebenes Consent-Formular (Upload)</Label>
        <Input id="consent-upload" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => void onConsentFileChange(e.target.files?.[0] ?? null)} />
        <p className="text-xs text-muted-foreground">
          Datei wird als Nachweis mit der Freigabe gespeichert.
        </p>
      </div>
      <div className="rounded-md border border-border p-3 space-y-2">
        <p className="text-sm font-medium">Nicht der richtige Ansprechpartner?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Name des Kollegen (optional)" value={delegateName} onChange={(e) => setDelegateName(e.target.value)} />
          <Input placeholder="E-Mail des Kollegen" value={delegateEmail} onChange={(e) => setDelegateEmail(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => void onDelegate()} disabled={loading}>
            An Kollegen delegieren
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-auto gap-2"
          disabled={loading}
          onClick={() => void submit('approved')}
        >
          <CheckIcon className="size-[18px]" />
          Freigabe erteilen
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full sm:w-auto gap-2"
          disabled={loading}
          onClick={() => void submit('rejected')}
        >
          <AppIcon icon={Cancel01Icon} size={18} />
          Ablehnen
        </Button>
      </div>
    </div>
  )
}
