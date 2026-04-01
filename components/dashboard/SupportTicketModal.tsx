'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader, Mail, Paperclip } from '@hugeicons/core-free-icons'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitTicket } from '@/app/dashboard/actions'
import { AppIcon } from '@/lib/icons'

const TITLE_BY_TYPE: Record<'support' | 'feedback', string> = {
  support: 'Ticket einreichen',
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
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<'sales' | 'technical' | 'billing' | 'account' | 'other'>(
    'other'
  )
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [attachments, setAttachments] = useState<File[]>([])

  const displayTitle = title ?? TITLE_BY_TYPE[type]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const safeEmail = email.trim()
      if (!safeEmail) {
        toast.error('Bitte eine E-Mail-Adresse angeben.')
        return
      }
      if (!subject.trim()) {
        toast.error('Bitte einen Betreff angeben.')
        return
      }
      if (!message.trim()) {
        toast.error('Bitte eine Beschreibung eingeben.')
        return
      }

      const fullSubject = `[${priorityLabel(priority)}] ${categoryLabel(
        category
      )} – ${subject.trim()}`
      const attachmentLine =
        attachments.length > 0
          ? `Anhänge: ${attachments.map((f) => f.name).join(', ')}`
          : 'Anhänge: —'
      const fullMessage =
        `E-Mail: ${safeEmail}\n\nKategorie: ${categoryLabel(category)}\nPriorität: ${priorityLabel(
          priority
        )}\n\nBeschreibung:\n${message.trim()}\n\n${attachmentLine}\n\n(Anhänge werden aktuell nicht serverseitig verarbeitet.)`

      const result = await submitTicket(type, fullSubject, fullMessage)
      if (result.success) {
        toast.success('Nachricht gesendet! Wir melden uns.')
        setSubject('')
        setMessage('')
        setEmail('')
        setCategory('other')
        setPriority('medium')
        setAttachments([])
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
        setEmail('')
        setCategory('other')
        setPriority('medium')
        setAttachments([])
      }
      onOpenChange(open)
    }
  }

  function priorityLabel(v: typeof priority) {
    switch (v) {
      case 'low':
        return 'Niedrig'
      case 'high':
        return 'Hoch'
      case 'critical':
        return 'Kritisch'
      case 'medium':
      default:
        return 'Mittel'
    }
  }

  function categoryLabel(v: typeof category) {
    switch (v) {
      case 'sales':
        return 'Sales'
      case 'technical':
        return 'Technischer Support'
      case 'billing':
        return 'Abrechnung'
      case 'account':
        return 'Konto'
      case 'other':
      default:
        return 'Sonstiges'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>
            {type === 'support'
              ? 'Beschreibe dein Anliegen. Unser Team meldet sich so schnell wie möglich bei dir.'
              : 'Teile uns deine Anmerkungen oder Wünsche mit.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-email">E-Mail-Adresse *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <AppIcon icon={Mail} size={16} />
              </span>
              <Input
                id="ticket-email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
                className="w-full pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kategorie *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="technical">Technischer Support</SelectItem>
                  <SelectItem value="billing">Abrechnung</SelectItem>
                  <SelectItem value="account">Konto</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priorität *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priorität wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Betreff *</Label>
            <Input
              id="ticket-subject"
              placeholder="Kurze Zusammenfassung deines Anliegens"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-message">Beschreibung *</Label>
            <Textarea
              id="ticket-message"
              placeholder="Bitte so viel Detail wie möglich…"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              required
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Anhänge</Label>
            <div className="text-xs text-muted-foreground">
              Max. 5 Dateien (max. 10MB pro Datei). Unterstützt: Bilder, PDFs und Textdateien.
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={submitting || attachments.length >= 5}
                onClick={() => {
                  const input = document.getElementById('ticket-attachments') as HTMLInputElement | null
                  input?.click()
                }}
              >
                <AppIcon icon={Paperclip} size={16} className="mr-2" />
                Dateien anhängen
              </Button>
              <input
                id="ticket-attachments"
                type="file"
                multiple
                disabled={submitting}
                className="hidden"
                accept="image/*,application/pdf,.txt,.md,.csv,.doc,.docx"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? [])
                  if (list.length === 0) return
                  const remaining = Math.max(0, 5 - attachments.length)
                  const capped = list.slice(0, remaining)
                  const filtered = capped.filter((f) => f.size <= 10 * 1024 * 1024)
                  const tooLarge = capped.length - filtered.length
                  if (tooLarge > 0) toast.error('Einige Dateien überschreiten 10MB und wurden entfernt.')
                  setAttachments((prev) => [...prev, ...filtered])
                  e.target.value = ''
                }}
              />
              <div className="text-xs text-muted-foreground">
                {attachments.length > 0 ? `${attachments.length} Datei${attachments.length === 1 ? '' : 'en'} ausgewählt` : 'Keine Dateien gewählt.'}
              </div>
            </div>
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
                  <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                  Wird gesendet…
                </>
              ) : (
                'Ticket einreichen'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
