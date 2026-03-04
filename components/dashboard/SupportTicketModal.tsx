'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitTicket } from '@/app/dashboard/actions'

const TITLE_BY_TYPE: Record<'support' | 'feedback', string> = {
  support: 'Support anfragen',
  feedback: 'Dein Feedback',
}

export function SupportTicketModal({
  isOpen,
  onOpenChange,
  type,
  title,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  type: 'support' | 'feedback'
  title?: string
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const displayTitle = title ?? TITLE_BY_TYPE[type]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await submitTicket(type, subject, message)
      if (result.success) {
        toast.success('Nachricht gesendet! Wir melden uns.')
        setSubject('')
        setMessage('')
        onOpenChange(false)
      } else {
        toast.error(result.error ?? 'Fehler beim Senden.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Senden.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!submitting) {
      if (!open) {
        setSubject('')
        setMessage('')
      }
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>
            {type === 'support'
              ? 'Beschreibe dein Anliegen. Unser Team meldet sich bei dir.'
              : 'Teile uns deine Anmerkungen oder Wünsche mit.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Betreff</Label>
            <Input
              id="ticket-subject"
              placeholder="Kurze Beschreibung deines Anliegens"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-message">Nachricht</Label>
            <Textarea
              id="ticket-message"
              placeholder="Deine Nachricht …"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              required
              className="w-full resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Wird gesendet…
                </>
              ) : (
                'Senden'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
