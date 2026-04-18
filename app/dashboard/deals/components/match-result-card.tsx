'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LinkIcon, Loader, Sparkles, FileText } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { formatNumberDe } from '@/lib/format'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import type { MatchReferenceHit } from '@/app/dashboard/actions'
import {
  createSharedPortfolio,
  generateSummaryFromStory,
  getReferencesByIds,
} from '@/app/dashboard/actions'
import { addReferenceToDealWithScore } from '../actions'
import { PdfExportDialog } from '@/app/dashboard/evidence/[id]/pdf-export-dialog'

function formatVolume(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  const n = parseInt(String(raw).replace(/\D/g, ''), 10)
  if (!Number.isNaN(n) && String(raw).replace(/\D/g, '').length >= 4) {
    return `${formatNumberDe(n)} €`
  }
  return raw
}

export function MatchResultCard({
  hit,
  dealId,
  alreadyLinked,
  onLinked,
}: {
  hit: MatchReferenceHit
  dealId: string
  alreadyLinked: boolean
  onLinked: () => void
}) {
  const [pdfOpen, setPdfOpen] = useState(false)
  const [kiOpen, setKiOpen] = useState(false)
  const [kiLoading, setKiLoading] = useState(false)
  const [kiText, setKiText] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)

  async function handleShare() {
    setShareLoading(true)
    try {
      const res = await createSharedPortfolio([hit.id])
      if (!res.success) {
        toast.error(res.error)
        return
      }
      const abs =
        typeof window !== 'undefined' ? new URL(res.url, window.location.origin).href : res.url
      await navigator.clipboard.writeText(abs)
      toast.success('Kundenlink in die Zwischenablage kopiert.')
    } finally {
      setShareLoading(false)
    }
  }

  async function openKi() {
    setKiOpen(true)
    setKiText(null)
    setKiLoading(true)
    try {
      const rows = await getReferencesByIds([hit.id])
      const ref = rows[0]
      if (!ref) {
        toast.error('Referenz konnte nicht geladen werden.')
        setKiOpen(false)
        return
      }
      const result = await generateSummaryFromStory(
        ref.customer_challenge,
        ref.our_solution,
        ref.id
      )
      if (!result.success) {
        toast.error(result.error)
        setKiText(null)
        return
      }
      setKiText(result.summary)
    } finally {
      setKiLoading(false)
    }
  }

  async function handleDealLink() {
    setLinkLoading(true)
    try {
      const res = await addReferenceToDealWithScore({
        dealId,
        referenceId: hit.id,
        similarityScore: hit.similarity,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Konnte Referenz nicht verknüpfen.')
        return
      }
      toast.success('In Deal übernommen.')
      onLinked()
    } finally {
      setLinkLoading(false)
    }
  }

  const meta = [
    hit.industry?.trim() || null,
    hit.companyName?.trim() || null,
    formatVolume(hit.volumeEur),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex gap-4">
        <MatchScoreCircle similarity01={hit.similarity} />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <Link
              href={ROUTES.evidence.detail(hit.id)}
              className="font-semibold text-foreground hover:underline line-clamp-2"
            >
              {hit.title}
            </Link>
            {meta ? (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{meta}</p>
            ) : null}
          </div>
          {hit.snippet ? (
            <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{hit.snippet}</p>
          ) : null}

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPdfOpen(true)}>
              <AppIcon icon={FileText} size={14} className="mr-1" />
              PDF exportieren
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={shareLoading}
              onClick={() => void handleShare()}
            >
              {shareLoading ? (
                <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
              ) : (
                <AppIcon icon={LinkIcon} size={14} className="mr-1" />
              )}
              Link erstellen
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => void openKi()}>
              <AppIcon icon={Sparkles} size={14} className="mr-1" />
              KI-Entwurf
            </Button>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" asChild>
              <Link href={ROUTES.evidence.detail(hit.id)}>→ Details</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={alreadyLinked || linkLoading}
              onClick={() => void handleDealLink()}
            >
              {linkLoading ? (
                <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
              ) : null}
              {alreadyLinked ? 'Bereits im Deal' : 'In Deal übernehmen'}
            </Button>
          </div>
        </div>
      </div>

      <PdfExportDialog
        referenceId={hit.id}
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        showTriggerButton={false}
      />

      <Dialog open={kiOpen} onOpenChange={setKiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>KI-Entwurf</DialogTitle>
            <DialogDescription>
              Kurze vertriebsorientierte Zusammenfassung aus Herausforderung und Lösung dieser Referenz.
            </DialogDescription>
          </DialogHeader>
          {kiLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AppIcon icon={Loader} size={16} className="animate-spin" /> Wird erzeugt …
            </p>
          ) : kiText ? (
            <Textarea readOnly value={kiText} className="min-h-[160px] text-sm" />
          ) : (
            <p className="text-sm text-muted-foreground">Kein Text.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setKiOpen(false)}>
              Schließen
            </Button>
            {kiText ? (
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(kiText).then(() => toast.success('Kopiert.'))
                }}
              >
                Kopieren
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
