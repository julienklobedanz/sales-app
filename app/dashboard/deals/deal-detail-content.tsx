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
import { addReferenceToDeal, removeReferenceFromDeal, recordReferenceHelped } from './actions'
import {
  CirclePlus,
  Trash2,
} from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

export type RefOption = { id: string; title: string; company_name: string }

type DealActivity = { id: string; at: Date; title: string; detail: string }

function splitTags(tags: string | null | undefined) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function DealDetailContent({
  deal,
  allReferences,
  activities,
}: {
  deal: DealWithReferences
  allReferences: RefOption[]
  activities: DealActivity[]
}) {
  const router = useRouter()
  const linkedIds = new Set(deal.references.map((r) => r.id))
  const availableRefs = allReferences.filter((r) => !linkedIds.has(r.id))
  const [linkRefId, setLinkRefId] = useState('')
  const [linking, setLinking] = useState(false)

  async function handleAddReference() {
    if (!linkRefId) return
    setLinking(true)
    const result = await addReferenceToDeal(deal.id, linkRefId)
    setLinking(false)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Referenz verknüpft.')
      setLinkRefId('')
      router.refresh()
    }
  }

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anforderungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {deal.requirements_text?.trim() ? deal.requirements_text : '—'}
          </div>
        </CardContent>
      </Card>

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
                            href={ROUTES.evidence.edit(ref.id)}
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
          {availableRefs.length > 0 && (
            <div className="flex gap-2 pt-2">
              <Select value={linkRefId || '__none__'} onValueChange={(v) => setLinkRefId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="max-w-[240px] h-8 text-xs">
                  <SelectValue placeholder="Referenz verknüpfen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Auswählen —</SelectItem>
                  {availableRefs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title} ({r.company_name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={handleAddReference} disabled={!linkRefId || linking}>
                <AppIcon icon={CirclePlus} size={16} className="mr-1" />
                Verknüpfen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.length ? (
            <ol className="relative ml-2 border-l pl-6">
              {activities.map((a) => (
                <li key={a.id} className="pb-4 last:pb-0">
                  <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-muted ring-4 ring-background" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.at.toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {a.detail ? (
                    <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.detail}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
          )}
        </CardContent>
      </Card>
    </div>
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
