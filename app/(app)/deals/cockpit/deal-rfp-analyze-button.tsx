'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'

import type { DealDocumentRow } from '../document-actions'
import { setDealDocumentKind } from '../document-actions'

function pickAnalyzeDocument(documents: DealDocumentRow[]): DealDocumentRow | null {
  return documents.find((doc) => doc.kind === 'ausschreibung') ?? documents[0] ?? null
}

async function ensureAusschreibungKind(doc: DealDocumentRow): Promise<boolean> {
  if (doc.kind === 'ausschreibung') return true
  const res = await setDealDocumentKind(doc.id, 'ausschreibung')
  if (!res.success) {
    toast.error(res.error ?? 'Dokumenttyp konnte nicht geändert werden.')
    return false
  }
  return true
}

export async function runDealRfpAnalyze(
  dealId: string,
  doc: DealDocumentRow,
  stage: 'quick' | 'full' = 'full',
): Promise<{ success: boolean; error?: string }> {
  const kindOk = await ensureAusschreibungKind(doc)
  if (!kindOk) return { success: false }

  const res = await fetch('/api/rfp/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId, dealDocumentId: doc.id, stage }),
  })
  const json = (await res.json()) as { success?: boolean; error?: string }
  if (!res.ok || !json.success) {
    return { success: false, error: json.error ?? COPY.deals.cockpit.documentsAnalyzeFailed }
  }
  return { success: true }
}

export function DealRfpAnalyzeButton({
  dealId,
  documents,
  canManage,
  hasAnalysis,
  variant = 'default',
  className,
  showHintBelow = false,
  onAnalyzed,
}: {
  dealId: string
  documents: DealDocumentRow[]
  canManage: boolean
  hasAnalysis: boolean
  isStale: boolean
  variant?: 'default' | 'outline'
  className?: string
  showHintBelow?: boolean
  onAnalyzed?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<'quick' | 'full' | null>(null)
  const targetDoc = pickAnalyzeDocument(documents)

  async function handleClick(stage: 'quick' | 'full') {
    if (!canManage || !targetDoc) {
      document
        .getElementById('dokumente')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    setPending(stage)
    try {
      const result = await runDealRfpAnalyze(dealId, targetDoc, stage)
      if (!result.success) {
        toast.error(result.error ?? COPY.deals.cockpit.documentsAnalyzeFailed)
        return
      }
      toast.success(
        stage === 'quick'
          ? COPY.deals.cockpit.documentsQuickscanSuccess
          : COPY.deals.cockpit.documentsAnalyzeSuccess,
      )
      onAnalyzed?.()
      router.refresh()
    } catch {
      toast.error(COPY.deals.cockpit.documentsAnalyzeFailed)
    } finally {
      setPending(null)
    }
  }

  const busy = pending !== null
  const label = busy
    ? COPY.deals.cockpit.documentsAnalyzePending
    : !targetDoc
      ? COPY.deals.cockpit.rfpAnalyzeCta
      : hasAnalysis
        ? COPY.deals.cockpit.documentsReanalyze
        : COPY.deals.cockpit.documentsAnalyze

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        disabled={busy}
        onClick={() => void handleClick('quick')}
      >
        {pending === 'quick' ? (
          <>
            <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
            {COPY.deals.cockpit.documentsAnalyzePending}
          </>
        ) : (
          COPY.deals.cockpit.documentsQuickscan
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={variant}
        className="shrink-0"
        disabled={busy}
        onClick={() => void handleClick('full')}
      >
        {pending === 'full' ? (
          <>
            <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
            {label}
          </>
        ) : (
          label
        )}
      </Button>
      {showHintBelow ? (
        <p className="mt-1 w-full text-right text-xs font-medium text-muted-foreground">
          {COPY.deals.cockpit.rfpReanalyzeHint}
        </p>
      ) : null}
    </div>
  )
}
