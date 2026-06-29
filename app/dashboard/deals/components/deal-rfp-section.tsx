'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileUp, Loader, Sparkles } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DealCoverageMatrix } from '@/components/deals/deal-coverage-matrix'
import { AppIcon } from '@/lib/icons'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'

import type { DealWithReferences } from '../types'
import { addReferenceToDealWithScore } from '../actions'
import { generateRfpResponseBlockAction } from '../rfp-response-block'

type RfpCoverageMatch = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
  companyName?: string | null
}

type RfpAnalyzeResult = {
  analysisId: string
  storagePath: string
  requirements: { id: string; text: string; category?: string }[]
  coverage: Array<{
    requirementId: string
    requirementText: string
    category?: string
    matches: RfpCoverageMatch[]
    embedError?: string
  }>
}

export type DealRfpSectionInitial = {
  projectId: string
  requirements: RfpAnalyzeResult['requirements']
  coverage: RfpAnalyzeResult['coverage']
}

function toAnalyzeResult(initial: DealRfpSectionInitial): RfpAnalyzeResult {
  return {
    analysisId: initial.projectId,
    storagePath: '',
    requirements: initial.requirements,
    coverage: initial.coverage,
  }
}

type Company = { id: string; name: string }

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Wireframe §13: RFP-Upload, Anforderungsmatrix, Coverage, Exporte. */
export function DealRfpSection({
  deal,
  companies,
  initialResult,
}: {
  deal: DealWithReferences
  companies: Company[]
  initialResult?: DealRfpSectionInitial | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [companyContextId, setCompanyContextId] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<RfpAnalyzeResult | null>(
    initialResult ? toAnalyzeResult(initialResult) : null
  )
  const [responseLoading, setResponseLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const linkedRefIds = new Set(deal.references.map((r) => r.id))

  const runAnalyze = useCallback(async () => {
    const file = pendingFile
    if (!file) {
      toast.error('Bitte zuerst eine PDF- oder DOCX-Datei wählen.')
      return
    }
    setAnalyzing(true)
    setResult(null)
    const formData = new FormData()
    formData.set('dealId', deal.id)
    formData.set('file', file)
    if (companyContextId) formData.set('companyContextId', companyContextId)
    try {
      const res = await fetch('/api/rfp/analyze', { method: 'POST', body: formData })
      const json = (await res.json()) as
        | {
            success: true
            projectId?: string
            analysisId: string
            storagePath: string
            requirements: RfpAnalyzeResult['requirements']
            coverage: RfpAnalyzeResult['coverage']
          }
        | { success: false; error?: string }

      if (!res.ok || !('success' in json) || !json.success) {
        const err = 'error' in json ? json.error : undefined
        toast.error(err ?? 'RFP-Analyse fehlgeschlagen.')
        return
      }

      setResult({
        analysisId: json.analysisId ?? json.projectId,
        storagePath: json.storagePath ?? '',
        requirements: json.requirements,
        coverage: json.coverage,
      })
      toast.success('RFP analysiert.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Netzwerkfehler.')
    } finally {
      setAnalyzing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [deal.id, pendingFile, companyContextId])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      toast.error('Bitte eine PDF- oder DOCX-Datei verwenden.')
      return
    }
    setPendingFile(file)
  }

  const totalReq = result?.coverage.length ?? 0

  function exportMatrixPdf() {
    if (!result) return
    const w = window.open('', '_blank')
    if (!w) {
      toast.error('Pop-up blockiert – bitte erlauben für PDF-Druck.')
      return
    }
    const rowsHtml = result.coverage
      .map((row) => {
        const best = row.matches[0]
        const ref = best
          ? `${escapeHtml(best.title)}${best.companyName ? ` (${escapeHtml(best.companyName)})` : ''}`
          : '—'
        const score = best ? `${Math.round(best.similarity * 100)} %` : '—'
        const gap = !best || row.embedError
        return `<tr class="${gap ? 'gap' : ''}"><td>${escapeHtml(row.requirementText.slice(0, 400))}</td><td>${ref}</td><td>${score}</td></tr>`
      })
      .join('')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>RFP-Matrix</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; font-size: 11px; vertical-align: top; }
        th { background: #f4f4f5; text-align: left; }
        tr.gap { background: #fffbeb; }
      </style></head><body>
      <h1>${escapeHtml(deal.title)} – Anforderungsmatrix</h1>
      <p style="font-size:12px;color:#666;">Analyse ${escapeHtml(result.analysisId)}</p>
      <table>
        <thead><tr><th>Anforderung</th><th>Beste Referenz</th><th>Score</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  async function exportResponseBlock() {
    if (!result) return
    setResponseLoading(true)
    try {
      const res = await generateRfpResponseBlockAction({
        dealTitle: deal.title,
        coverage: result.coverage.map((row) => ({
          requirementId: row.requirementId,
          requirementText: row.requirementText,
          matches: row.matches.map((m) => ({
            title: m.title,
            similarity: m.similarity,
            companyName: m.companyName ?? null,
          })),
        })),
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>RFP-Response-Baustein</title></head><body style="font-family:system-ui;padding:24px;white-space:pre-wrap;">${escapeHtml(res.text)}</body></html>`
        )
        w.document.close()
      }
      await navigator.clipboard.writeText(res.text)
      toast.success('Baustein in Zwischenablage; Text auch in neuem Fenster.')
    } finally {
      setResponseLoading(false)
    }
  }

  async function linkBestMatch(referenceId: string, similarity: number) {
    setLinkingId(referenceId)
    try {
      const res = await addReferenceToDealWithScore({
        dealId: deal.id,
        referenceId,
        similarityScore: similarity,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Verknüpfung fehlgeschlagen.')
        return
      }
      toast.success('Referenz mit Deal verknüpft.')
      router.refresh()
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">RFP-Analyse</CardTitle>
        <CardDescription>
          Dokument hochladen (PDF/DOCX), Anforderungen extrahieren und mit Referenz-Embeddings abgleichen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="rounded-lg border border-dashed border-muted-foreground/35 bg-muted/20 px-4 py-8 text-center text-sm transition hover:bg-muted/35"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="text-muted-foreground">
            RFP-Dokument hier ablegen oder Datei wählen (PDF · DOCX)
          </div>
          {pendingFile ? (
            <div className="mt-2 font-medium text-foreground">{pendingFile.name}</div>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPendingFile(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => inputRef.current?.click()}
          >
            <AppIcon icon={FileUp} size={16} className="mr-2" />
            Datei wählen
          </Button>
        </div>

        {companies.length > 0 ? (
          <div className="space-y-2">
            <Label>Account (optional)</Label>
            <Select value={companyContextId || '__none__'} onValueChange={(v) => setCompanyContextId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Kontext für Extraktion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Kein spezieller Account —</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Wird beim Einlesen in den Kontext der KI-Anforderungsextraktion aufgenommen.
            </p>
          </div>
        ) : null}

        <Button type="button" size="sm" disabled={analyzing || !pendingFile} onClick={() => void runAnalyze()}>
          {analyzing ? (
            <>
              <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
              Analyse läuft …
            </>
          ) : (
            'Analysieren'
          )}
        </Button>

        {result && totalReq > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={exportMatrixPdf}>
                Als PDF exportieren
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={responseLoading}
                onClick={() => void exportResponseBlock()}
              >
                {responseLoading ? (
                  <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                ) : (
                  <AppIcon icon={Sparkles} size={16} className="mr-2" />
                )}
                RFP-Response-Baustein generieren
              </Button>
            </div>

            <DealCoverageMatrix
              coverage={result.coverage as RfpCoverageRow[]}
              dealId={deal.id}
              linkedRefIds={linkedRefIds}
              linkingId={linkingId}
              onLinkBestMatch={(referenceId, similarity) => void linkBestMatch(referenceId, similarity)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
