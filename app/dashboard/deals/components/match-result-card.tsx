'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  LinkIcon,
  Loader,
  Sparkles,
  FileText,
  InformationCircleIcon,
  FileDownloadIcon,
} from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { CompanyLogo } from '@/components/ui/company-logo'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { MatchScoreCircle } from '@/components/match/match-score-circle'
import { getMatchStrength } from '@/lib/match/match-strength'
import { formatMatchReferenceMetaLine } from '@/lib/match/match-reference-meta'
import type { MatchReferenceHit } from '@/lib/match/match-types'
import { createSharedPortfolio } from '@/app/dashboard/actions'
import { addReferenceToDealWithScore, removeReferenceFromDeal } from '../actions'
import { PdfExportDialog } from '@/app/dashboard/references/[id]/pdf-export-dialog'
import { AiDraftSheet } from './ai-draft-sheet'

export function MatchResultCard({
  hit,
  dealId,
  dealContext,
  alreadyLinked,
  onLinked,
  rank,
  gapToNext,
  variant = 'card',
}: {
  hit: MatchReferenceHit
  /** Ohne Deal: keine Verknüpfung „In Deal übernehmen“. */
  dealId?: string | null
  /** Deal-Infos für Epic-5-KI-Prompt (optional). */
  dealContext?: string | null
  alreadyLinked: boolean
  onLinked: () => void
  /** 1-basierter Rang in der Ergebnisliste (für Match-Stärke). */
  rank?: number
  /** Abstand zum nächsten Treffer — nur für Platz 1 relevant. */
  gapToNext?: number | null
  /** `embedded`: Zeile in zusammenhängender Homepage-Gruppen-Karte. */
  variant?: 'card' | 'embedded'
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
        typeof window !== 'undefined'
          ? new URL(res.url, window.location.origin).href
          : res.url
      // Kundenlink ist immer /p/{slug} — ohne ?manage=
      await navigator.clipboard.writeText(abs)
      toast.success('Kundenlink in die Zwischenablage kopiert.')
    } finally {
      setShareLoading(false)
    }
  }

  async function handleDealLink() {
    if (!dealId) return
    setLinkLoading(true)
    try {
      if (alreadyLinked) {
        const res = await removeReferenceFromDeal(dealId, hit.id)
        if (res.error) {
          toast.error(res.error)
          return
        }
        toast.success('Referenz aus Deal entfernt.')
        onLinked()
        return
      }
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

  const companyName = hit.companyName?.trim() || null
  const meta = formatMatchReferenceMetaLine({
    industry: hit.industry,
    volumeEur: hit.volumeEur,
    createdAt: hit.createdAt,
    projectStart: hit.projectStart,
    projectEnd: hit.projectEnd,
  })

  const matchStrength = getMatchStrength(hit.similarity, { rank, gapToNext })

  return (
    <div
      className={cn(
        variant === 'embedded'
          ? 'px-4 py-2.5'
          : 'rounded-xl border bg-card p-4 shadow-sm',
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <CompanyLogo
              src={hit.companyLogoUrl}
              companyId={hit.companyId}
              fallbackText={companyName}
              containerClassName="size-11 shrink-0 rounded-xl"
              fallbackIconSize={20}
            />
            <div className="min-w-0 flex-1 text-left">
              {companyName ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                  {companyName}
                </p>
              ) : null}
              <Link
                href={ROUTES.references.detail(hit.id)}
                className="font-semibold text-foreground hover:underline line-clamp-2"
              >
                {hit.title}
              </Link>
              {meta ? (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {meta}
                </p>
              ) : null}
            </div>
          </div>
          <MatchScoreCircle
            key={`${hit.id}-${hit.similarity}`}
            strength={matchStrength}
          />
        </div>

        {hit.snippet ? (
          <p className="text-left text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {hit.snippet}
          </p>
        ) : null}

        {variant === 'embedded' ? (
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1">
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPdfOpen(true)}
              >
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setKiOpen(true)}
              >
                <AppIcon icon={Sparkles} size={14} className="mr-1" />
                KI-Entwurf
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 text-xs"
              asChild
            >
              <Link href={ROUTES.references.detail(hit.id)}>
                <AppIcon icon={InformationCircleIcon} size={14} className="mr-1" />
                Details
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-start gap-1.5 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setPdfOpen(true)}
            >
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setKiOpen(true)}
            >
              <AppIcon icon={Sparkles} size={14} className="mr-1" />
              KI-Entwurf
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              asChild
            >
              <Link href={ROUTES.references.detail(hit.id)}>
                <AppIcon icon={InformationCircleIcon} size={14} className="mr-1" />
                Details
              </Link>
            </Button>
            {dealId ? (
              <Button
                type="button"
                size="sm"
                variant={alreadyLinked ? 'outline' : 'default'}
                className="h-8 text-xs"
                disabled={linkLoading}
                title={
                  alreadyLinked
                    ? 'Klicken, um die Referenz aus dem Deal zu entfernen'
                    : undefined
                }
                onClick={() => void handleDealLink()}
              >
                {linkLoading ? (
                  <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
                ) : (
                  <AppIcon icon={FileDownloadIcon} size={14} className="mr-1" />
                )}
                {alreadyLinked ? 'Bereits im Deal' : 'In Deal übernehmen'}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <PdfExportDialog
        referenceId={hit.id}
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        showTriggerButton={false}
      />

      <AiDraftSheet
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
