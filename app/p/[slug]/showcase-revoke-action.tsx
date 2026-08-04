'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { revokePortfolioAccess } from '../actions'

const REVOKE_REASONS = [
  { id: 'outdated_content', label: 'Projektinhalte sind nicht mehr aktuell' },
  {
    id: 'compliance_change',
    label: 'Interne Compliance-Richtlinien haben sich geändert',
  },
  { id: 'contact_left', label: 'Ansprechpartner hat das Unternehmen verlassen' },
  { id: 'other', label: 'Sonstiges (Bitte angeben)' },
] as const

export function ShowcaseRevokeAction({ slug }: { slug: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const manageToken = searchParams.get('manage')?.trim() || null
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setReason('')
    setNotes('')
  }

  async function handleRevoke() {
    if (!reason) return

    setLoading(true)
    try {
      const textNotes = notes.trim() || undefined

      // 1. API-Call: POST /api/references/[id]/revoke { reason: selectedReason, notes: textNotes }
      // 2. Trigger Admin Notification: Sende E-Mail/In-App-Notification an Admin-Rolle über die Sperrung und den Grund.
      // 3. State-Update: Leite den User auf eine saubere "Referenz erfolgreich gesperrt"-Ergebnisseite weiter.

      const result = await revokePortfolioAccess({
        slug,
        manageToken,
        reason,
        details: textNotes,
      })
      if (!result.success) {
        toast.error('Sperren fehlgeschlagen.')
        return
      }
      toast.success(
        'Link gesperrt. Empfänger sehen die Referenz nicht mehr — Ihr Workspace wurde informiert.',
      )
      setOpen(false)
      resetForm()
      router.refresh()
    } catch {
      toast.error('Sperren fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="default"
        className="text-sm font-medium shadow-lg transition-transform hover:scale-105"
        onClick={() => setOpen(true)}
      >
        <ShieldAlert className="size-4" />
        Zugriff sperren
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zugriff sperren?</DialogTitle>
            <DialogDescription>
              Der Kundenlink ist danach für Empfänger nicht mehr erreichbar. Ihr
              Ansprechpartner im Workspace wird über die Sperrung informiert und kann bei
              Bedarf einen neuen Link anstoßen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason" className="text-sm font-medium">
                Grund der Sperrung <span className="text-destructive">*</span>
              </Label>
              <Select value={reason} onValueChange={setReason} disabled={loading}>
                <SelectTrigger id="revoke-reason" className="w-full">
                  <SelectValue placeholder="Grund auswählen …" />
                </SelectTrigger>
                <SelectContent>
                  {REVOKE_REASONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revoke-notes" className="text-sm font-medium">
                Zusätzliche Anmerkungen für den Admin{' '}
                <span className="text-xs font-normal italic text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="revoke-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Weitere Details zum Sperrgrund …"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRevoke()}
              disabled={loading || !reason}
            >
              {loading ? 'Wird gesperrt…' : 'Sperren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
