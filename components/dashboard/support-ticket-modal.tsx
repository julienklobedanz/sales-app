'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckmarkCircle02Icon, Loader } from '@hugeicons/core-free-icons'
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
import { AppIcon } from '@/lib/icons'
import { BRAND_PRIMARY_PILL_ACTIVE_CLASS } from '@/lib/cognism-shell-styles'
import { cn } from '@/lib/utils'

type FeedbackKind = 'idea' | 'bug' | 'other'

const FEEDBACK_KINDS: { value: FeedbackKind; label: string }[] = [
  { value: 'idea', label: 'Idee' },
  { value: 'bug', label: 'Bug' },
  { value: 'other', label: 'Sonstiges' },
]

function feedbackKindLabel(kind: FeedbackKind): string {
  return FEEDBACK_KINDS.find((k) => k.value === kind)?.label ?? 'Sonstiges'
}

function deriveSubject(message: string): string {
  const firstLine = message.trim().split(/\n/)[0]?.trim() ?? ''
  if (!firstLine) return 'Feedback'
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine
}

export function SupportTicketModal({
  isOpen,
  onOpenChange,
  title = 'Dein Feedback',
  defaultEmail = '',
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  defaultEmail?: string
}) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState(defaultEmail)
  const [editingEmail, setEditingEmail] = useState(false)
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>('idea')

  useEffect(() => {
    if (!isOpen) return
    setEmail(defaultEmail)
    setEditingEmail(false)
    setSent(false)
  }, [isOpen, defaultEmail])

  function resetForm() {
    setMessage('')
    setEmail(defaultEmail)
    setEditingEmail(false)
    setFeedbackKind('idea')
    setSent(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const safeEmail = email.trim()
    if (!safeEmail) {
      toast.error('Bitte eine E-Mail-Adresse angeben.')
      return
    }
    if (!message.trim()) {
      toast.error('Bitte dein Feedback eingeben.')
      return
    }

    setSubmitting(true)
    try {
      const page = typeof window !== 'undefined' ? window.location.pathname : '—'
      const resolvedSubject = `[${feedbackKindLabel(feedbackKind)}] ${deriveSubject(message)}`
      const fullMessage = `E-Mail: ${safeEmail}\n\nArt: ${feedbackKindLabel(feedbackKind)}\nSeite: ${page}\n\n${message.trim()}`

      const result = await submitTicket('feedback', resolvedSubject, fullMessage, { replyToEmail: safeEmail })
      if (result.success) {
        setSent(true)
        toast.success('Nachricht gesendet! Wir melden uns.')
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
    if (submitting) return
    if (!open) resetForm()
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!submitting}>
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <AppIcon icon={CheckmarkCircle02Icon} size={28} />
            </span>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg">Danke für dein Feedback</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Wir lesen jede Nachricht und melden uns bei Bedarf.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="default"
              className="mt-2"
              onClick={() => handleOpenChange(false)}
            >
              Schließen
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Was möchtest du uns sagen?</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Feedback-Art">
                {FEEDBACK_KINDS.map((kind) => {
                  const active = feedbackKind === kind.value
                  return (
                    <button
                      key={kind.value}
                      type="button"
                      disabled={submitting}
                      onClick={() => setFeedbackKind(kind.value)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? BRAND_PRIMARY_PILL_ACTIVE_CLASS
                          : 'border-border bg-background text-foreground hover:bg-muted/60'
                      )}
                    >
                      {kind.label}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-message" className="sr-only">
                  Feedback
                </Label>
                <Textarea
                  id="ticket-message"
                  placeholder="Was ist passiert oder was fehlt?"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  required
                  autoFocus
                  className="min-h-[140px] resize-none text-base"
                />
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
                {editingEmail ? (
                  <div className="space-y-2">
                    <Label htmlFor="ticket-email">Antwort an</Label>
                    <Input
                      id="ticket-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      autoFocus
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() => {
                          setEmail(defaultEmail)
                          setEditingEmail(false)
                        }}
                      >
                        Zurücksetzen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={submitting || !email.trim()}
                        onClick={() => setEditingEmail(false)}
                      >
                        Übernehmen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Antwort an{' '}
                    <span className="font-medium text-foreground">{email || '—'}</span>
                    {' · '}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      disabled={submitting}
                      onClick={() => setEditingEmail(true)}
                    >
                      ändern
                    </button>
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleOpenChange(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" variant="default" disabled={submitting || !message.trim()}>
                  {submitting ? (
                    <>
                      <AppIcon icon={Loader} size={16} className="animate-spin" />
                      Wird gesendet…
                    </>
                  ) : (
                    'Feedback senden'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
