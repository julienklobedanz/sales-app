'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'

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
  doc: DealDocumentRow
): Promise<{ ok: boolean; error?: string }> {
  const kindOk = await ensureAusschreibungKind(doc)
  if (!kindOk) return { ok: false }

  const res = await fetch('/api/rfp/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId, dealDocumentId: doc.id }),
  })
  const json = (await res.json()) as { success?: boolean; error?: string }
  if (!res.ok || !json.success) {
    return { ok: false, error: json.error ?? COPY.deals.cockpit.documentsAnalyzeFailed }
  }
  return { ok: true }
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
  const [pending, setPending] = useState(false)
  const targetDoc = pickAnalyzeDocument(documents)

  async function handleClick() {
    if (!canManage || !targetDoc) {
      document.getElementById('dokumente')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    setPending(true)
    try {
      const result = await runDealRfpAnalyze(dealId, targetDoc)
      if (!result.ok) {
        toast.error(result.error ?? COPY.deals.cockpit.documentsAnalyzeFailed)
        return
      }
      toast.success(COPY.deals.cockpit.documentsAnalyzeSuccess)
      onAnalyzed?.()
      router.refresh()
    } catch {
      toast.error(COPY.deals.cockpit.documentsAnalyzeFailed)
    } finally {
      setPending(false)
    }
  }

  const label = pending
    ? COPY.deals.cockpit.documentsAnalyzePending
    : !targetDoc
      ? COPY.deals.cockpit.rfpAnalyzeCta
      : hasAnalysis
        ? COPY.deals.cockpit.documentsReanalyze
        : COPY.deals.cockpit.documentsAnalyze

  return (
    <div className={className}>
      <Button
        type="button"
        size="sm"
        variant={variant}
        className="shrink-0"
        disabled={pending}
        onClick={() => void handleClick()}
      >
        {pending ? (
          <>
            <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
            {label}
          </>
        ) : (
          label
        )}
      </Button>
      {showHintBelow ? (
        <p className="mt-1 text-right text-xs font-medium text-muted-foreground">
          {COPY.deals.cockpit.rfpReanalyzeHint}
        </p>
      ) : null}
    </div>
  )
}
