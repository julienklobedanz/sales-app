'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/lib/icons'
import { Cancel01Icon, Checkmark } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { completeClientApproval } from './actions'

export function ApprovalDecisionForm({
  token,
  referenceTitle,
}: {
  token: string
  referenceTitle: string
}) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  async function submit(decision: 'approved' | 'rejected') {
    setLoading(true)
    try {
      const result = await completeClientApproval({
        token,
        decision,
        comment: comment.trim() || undefined,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-auto gap-2"
          disabled={loading}
          onClick={() => void submit('approved')}
        >
          <AppIcon icon={Checkmark} size={18} />
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
