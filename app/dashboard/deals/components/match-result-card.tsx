'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LinkIcon, Loader, Sparkles, FileText } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { formatNumberDe } from '@/lib/format'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import type { MatchReferenceHit } from '@/app/dashboard/actions'
import { createSharedPortfolio } from '@/app/dashboard/actions'
import { addReferenceToDealWithScore } from '../actions'
import { PdfExportDialog } from '@/app/dashboard/evidence/[id]/pdf-export-dialog'
import { KiEntwurfSheet } from './ki-entwurf-sheet'

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
  dealContext,
  alreadyLinked,
  onLinked,
}: {
  hit: MatchReferenceHit
  dealId: string
  /** Deal-Infos für Epic-5-KI-Prompt (optional). */
  dealContext?: string | null
  alreadyLinked: boolean
  onLinked: () => void
}) {
  const [pdfOpen, setPdfOpen] = useState(false)
  const [kiOpen, setKiOpen] = useState(false)
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
        <MatchScoreCircle key={`${hit.id}-${hit.similarity}`} similarity01={hit.similarity} />
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
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setKiOpen(true)}>
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

      <KiEntwurfSheet
        open={kiOpen}
        onOpenChange={setKiOpen}
        referenceId={hit.id}
        referenceTitle={hit.title}
        matchScore={hit.similarity}
        dealId={dealId}
        dealContext={dealContext ?? null}
      />
    </div>
  )
}
