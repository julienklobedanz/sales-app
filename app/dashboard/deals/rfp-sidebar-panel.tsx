'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FileUp, Loader } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'

import type { DealWithReferences } from './types'
import { EditDealDialog } from './components/edit-deal-dialog'
import { LinkReferenceDialog } from './components/link-reference-dialog'
import { FindMatchesDialog } from './components/find-matches-dialog'
import { OutcomeDialog } from './components/outcome-dialog'

type RfpCoverageMatch = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
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

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function RfpSidebarPanel({
  deal,
  companies,
  orgProfiles,
  allReferences,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  allReferences: Array<{ id: string; title: string; company_name: string }>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<RfpAnalyzeResult | null>(null)

  async function handleFile(file: File) {
    setAnalyzing(true)
    setResult(null)
    const formData = new FormData()
    formData.set('dealId', deal.id)
    formData.set('file', file)
    try {
      const res = await fetch('/api/rfp/analyze', { method: 'POST', body: formData })
      const json = (await res.json()) as
        | {
            success: true
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
        analysisId: json.analysisId,
        storagePath: json.storagePath,
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
  }

  const availableRefs = useMemo(() => {
    const linked = new Set(deal.references.map((r) => r.id))
    return allReferences.filter((r) => !linked.has(r.id))
  }, [allReferences, deal.references])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktionen</CardTitle>
        <CardDescription>Bearbeiten, Referenzen und Outcome.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <EditDealDialog deal={deal} companies={companies} orgProfiles={orgProfiles} />

        <LinkReferenceDialog dealId={deal.id} availableRefs={availableRefs} />

        <FindMatchesDialog dealId={deal.id} />

        <OutcomeDialog dealId={deal.id} />

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={analyzing}
          onClick={() => inputRef.current?.click()}
        >
          {analyzing ? (
            <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
          ) : (
            <AppIcon icon={FileUp} size={16} className="mr-2" />
          )}
          {analyzing ? 'Analyse läuft …' : 'RFP hochladen (PDF/DOCX)'}
        </Button>

        <Button asChild size="sm" className="w-full">
          <Link href={`/dashboard/deals/request/new?dealId=${encodeURIComponent(deal.id)}`}>
            Referenzbedarf melden
          </Link>
        </Button>

        {result ? (
          <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
            <div className="text-muted-foreground">
              Analyse-ID: <code className="text-foreground">{result.analysisId}</code>
            </div>
            <div className="text-muted-foreground">
              Anforderungen: <span className="text-foreground">{result.requirements.length}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

