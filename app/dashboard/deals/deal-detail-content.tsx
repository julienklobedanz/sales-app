'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type DealWithReferences } from './types'
import { removeReferenceFromDeal, recordReferenceHelped } from './actions'
import { Trash2 } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

function splitTags(tags: string | null | undefined) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function DealDetailContent({ deal }: { deal: DealWithReferences }) {
  const router = useRouter()

  async function handleRemoveReference(referenceId: string) {
    const result = await removeReferenceFromDeal(deal.id, referenceId)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Verknüpfung entfernt.')
      router.refresh()
    }
  }

  async function handleReferenceHelped(referenceId: string, helped: boolean, comment?: string) {
    const result = await recordReferenceHelped({ dealId: deal.id, referenceId, helped, comment })
    if (!result.success) toast.error(result.error ?? 'Konnte Feedback nicht speichern.')
    else toast.success('Feedback gespeichert.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Verknüpfte Referenzen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deal.references.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Referenzen verknüpft.</p>
        ) : (
          <div className="space-y-2">
            {deal.references.map((ref) => (
              <div key={ref.id} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  {ref.logo_url ? (
                    <img
                      src={ref.logo_url}
                      alt=""
                      className="h-10 w-10 rounded border bg-background object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={ROUTES.references.edit(ref.id)}
                          className="font-medium hover:underline block truncate"
                        >
                          {ref.title}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate">
                          {ref.company_name}
                          {typeof ref.similarity_score === 'number'
                            ? ` · ${(ref.similarity_score * 100).toFixed(0)}%`
                            : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReferenceHelpedDialog
                          onSubmit={(helped, comment) => handleReferenceHelped(ref.id, helped, comment)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => handleRemoveReference(ref.id)}
                        >
                          <AppIcon icon={Trash2} size={16} />
                        </Button>
                      </div>
                    </div>

                    {ref.summary ? (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        {ref.summary}
                      </p>
                    ) : null}

                    {splitTags(ref.tags).length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {splitTags(ref.tags).slice(0, 6).map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReferenceHelpedDialog({
  onSubmit,
}: {
  onSubmit: (helped: boolean, comment?: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [helped, setHelped] = useState<'yes' | 'no' | ''>('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!helped) return
    setSaving(true)
    try {
      await onSubmit(helped === 'yes', comment.trim() || undefined)
      setOpen(false)
      setHelped('')
      setComment('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hat diese Referenz geholfen?</DialogTitle>
          <DialogDescription>
            Kurzes Feedback hilft, Matching und Bestand zu verbessern.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Antwort</Label>
            <Select value={helped || '__none__'} onValueChange={(v) => setHelped(v === '__none__' ? '' : (v as 'yes' | 'no'))}>
              <SelectTrigger>
                <SelectValue placeholder="Bitte auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="yes">Ja</SelectItem>
                <SelectItem value="no">Nein</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref-helped-comment">Kommentar (optional)</Label>
            <Textarea
              id="ref-helped-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="z. B. relevant wegen Branche/Scope; fehlte aber XY …"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !helped}>
            {saving ? 'Speichern …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
