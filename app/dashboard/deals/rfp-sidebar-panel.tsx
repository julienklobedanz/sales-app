'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, FileUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

export function RfpSidebarPanel({ dealId }: { dealId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<RfpAnalyzeResult | null>(null)

  async function handleFile(file: File) {
    setAnalyzing(true)
    setResult(null)
    const formData = new FormData()
    formData.set('dealId', dealId)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktionen</CardTitle>
        <CardDescription>RFP hochladen und analysieren.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
          {analyzing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}
          {analyzing ? 'Analyse läuft …' : 'RFP hochladen (PDF/DOCX)'}
        </Button>

        <Button asChild size="sm" className="w-full">
          <Link href={`/dashboard/deals/request/new?dealId=${encodeURIComponent(dealId)}`}>
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

