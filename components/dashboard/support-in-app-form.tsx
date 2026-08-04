'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckmarkCircle02Icon, Loader } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { submitTicket } from '@/app/dashboard/actions'
import { AppIcon } from '@/lib/icons'
import { BRAND_PRIMARY_PILL_ACTIVE_CLASS } from '@/lib/cognism-shell-styles'
import { cn } from '@/lib/utils'

export type SupportCategory = 'sales' | 'technical' | 'billing' | 'account' | 'other'

const SUPPORT_CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'technical', label: 'Technik' },
  { value: 'account', label: 'Konto' },
  { value: 'billing', label: 'Abrechnung' },
  { value: 'sales', label: 'Sales' },
  { value: 'other', label: 'Sonstiges' },
]

function categoryLabel(category: SupportCategory): string {
  return SUPPORT_CATEGORIES.find((c) => c.value === category)?.label ?? 'Sonstiges'
}

function deriveSubject(message: string): string {
  const firstLine = message.trim().split(/\n/)[0]?.trim() ?? ''
  if (!firstLine) return 'Support-Anfrage'
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine
}

export function SupportInAppForm({
  defaultEmail = '',
  onCancel,
  cancelLabel = 'Abbrechen',
  submitLabel = 'Nachricht senden',
  showCancel = true,
  onSent,
}: {
  defaultEmail?: string
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
  showCancel?: boolean
  onSent?: () => void
}) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState(defaultEmail)
  const [editingEmail, setEditingEmail] = useState(false)
  const [category, setCategory] = useState<SupportCategory>('technical')

  useEffect(() => {
    setEmail(defaultEmail)
    setEditingEmail(false)
  }, [defaultEmail])

  function resetForm() {
    setMessage('')
    setEmail(defaultEmail)
    setEditingEmail(false)
    setCategory('technical')
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
      toast.error('Bitte dein Anliegen beschreiben.')
      return
    }

    setSubmitting(true)
    try {
      const page = typeof window !== 'undefined' ? window.location.pathname : '—'
      const resolvedSubject = `[${categoryLabel(category)}] ${deriveSubject(message)}`
      const fullMessage = `E-Mail: ${safeEmail}\n\nKategorie: ${categoryLabel(category)}\nSeite: ${page}\n\n${message.trim()}`

      const result = await submitTicket('support', resolvedSubject, fullMessage, {
        replyToEmail: safeEmail,
      })
      if (result.success) {
        setSent(true)
        toast.success('Nachricht gesendet! Wir melden uns.')
        onSent?.()
      } else {
        toast.error(result.error ?? 'Fehler beim Senden.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Senden.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <AppIcon icon={CheckmarkCircle02Icon} size={28} />
        </span>
        <div className="space-y-1.5">
          <DialogTitle className="text-lg">Nachricht gesendet</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Unser Team meldet sich so schnell wie möglich bei dir.
          </DialogDescription>
        </div>
        {onCancel ? (
          <Button
            type="button"
            variant="default"
            className="mt-1"
            onClick={() => {
              resetForm()
              onCancel()
            }}
          >
            Schließen
          </Button>
        ) : (
          <Button type="button" variant="default" className="mt-1" onClick={resetForm}>
            Weitere Nachricht
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kategorie">
        {SUPPORT_CATEGORIES.map((item) => {
          const active = category === item.value
          return (
            <button
              key={item.value}
              type="button"
              disabled={submitting}
              onClick={() => setCategory(item.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? BRAND_PRIMARY_PILL_ACTIVE_CLASS
                  : 'border-border bg-background text-foreground hover:bg-muted/60',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-message" className="sr-only">
          Nachricht
        </Label>
        <Textarea
          id="support-message"
          placeholder="Was ist passiert oder wobei brauchst du Hilfe?"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
          required
          autoFocus
          className="min-h-[120px] resize-none text-base"
        />
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
        {editingEmail ? (
          <div className="space-y-2">
            <Label htmlFor="support-email">Antwort an</Label>
            <Input
              id="support-email"
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
            Antwort an <span className="font-medium text-foreground">{email || '—'}</span>
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
        {showCancel && onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        ) : null}
        <Button type="submit" variant="default" disabled={submitting || !message.trim()}>
          {submitting ? (
            <>
              <AppIcon icon={Loader} size={16} className="animate-spin" />
              Wird gesendet…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
