'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { delegateClientApproval } from './actions'
import { ApprovalOptionalLabel } from './approval-form-labels'

export function ApprovalDelegateDialog({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [delegateName, setDelegateName] = useState('')
  const [delegateEmail, setDelegateEmail] = useState('')
  const [loading, setLoading] = useState(false)

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
      toast.success('Delegation gespeichert. Der Kollege erhält den Freigabe-Link per E-Mail.')
      setOpen(false)
      setDelegateName('')
      setDelegateEmail('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <p className="text-sm text-muted-foreground">
        Nicht zuständig?{' '}
        <DialogTrigger asChild>
          <button
            type="button"
            className="font-medium text-primary/75 transition-colors hover:text-primary"
          >
            An einen Kollegen weiterleiten
          </button>
        </DialogTrigger>
      </p>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Freigabe delegieren</DialogTitle>
          <DialogDescription>
            Leiten Sie diese Anfrage an eine zuständige Kollegin oder einen Kollegen weiter.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <ApprovalOptionalLabel htmlFor="delegate-name">Name des Kollegen</ApprovalOptionalLabel>
            <Input
              id="delegate-name"
              value={delegateName}
              onChange={(e) => setDelegateName(e.target.value)}
              placeholder="Vor- und Nachname"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delegate-email">E-Mail des Kollegen</Label>
            <Input
              id="delegate-email"
              type="email"
              value={delegateEmail}
              onChange={(e) => setDelegateEmail(e.target.value)}
              placeholder="kollege@unternehmen.de"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button type="button" onClick={() => void onDelegate()} disabled={loading}>
            Delegieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
