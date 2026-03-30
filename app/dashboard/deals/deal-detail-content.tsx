'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
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
import { DEAL_STATUS_LABELS, type DealWithReferences } from './types'
import { submitReferenceRequest, addReferenceToDeal, removeReferenceFromDeal } from './actions'
import {
  FileTextIcon,
  SendIcon,
  PlusCircleIcon,
  Trash2Icon,
  Loader2,
  FileUp,
} from 'lucide-react'
import { toast } from 'sonner'

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

export type RefOption = { id: string; title: string; company_name: string }

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

export function DealDetailContent({
  deal,
  allReferences,
}: {
  deal: DealWithReferences
  allReferences: RefOption[]
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const linkedIds = new Set(deal.references.map((r) => r.id))
  const availableRefs = allReferences.filter((r) => !linkedIds.has(r.id))
  const [linkRefId, setLinkRefId] = useState('')
  const [linking, setLinking] = useState(false)
  const rfpInputRef = useRef<HTMLInputElement>(null)
  const [rfpAnalyzing, setRfpAnalyzing] = useState(false)
  const [rfpResult, setRfpResult] = useState<RfpAnalyzeResult | null>(null)

  async function handleRfpFile(file: File) {
    setRfpAnalyzing(true)
    setRfpResult(null)
    const formData = new FormData()
    formData.set('dealId', deal.id)
    formData.set('file', file)
    try {
      const res = await fetch('/api/rfp/analyze', { method: 'POST', body: formData })
      const json = (await res.json()) as
        | { success: true; analysisId: string; storagePath: string; requirements: RfpAnalyzeResult['requirements']; coverage: RfpAnalyzeResult['coverage'] }
        | { success: false; error?: string }

      if (!res.ok || !('success' in json) || !json.success) {
        const err = 'error' in json ? json.error : undefined
        toast.error(err ?? 'RFP-Analyse fehlgeschlagen.')
        return
      }

      setRfpResult({
        analysisId: json.analysisId,
        storagePath: json.storagePath,
        requirements: json.requirements,
        coverage: json.coverage,
      })
      toast.success('RFP analysiert. Coverage siehe unten.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Netzwerkfehler.')
    } finally {
      setRfpAnalyzing(false)
      if (rfpInputRef.current) rfpInputRef.current.value = ''
    }
  }

  async function handleSubmitRequest() {
    setSending(true)
    const result = await submitReferenceRequest(deal.id, message)
    setSending(false)
    if (result.success) {
      toast.success('Nachricht an den Reference Manager gesendet.')
      setModalOpen(false)
      setMessage('')
    } else {
      toast.error(result.error)
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight">{deal.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{DEAL_STATUS_LABELS[deal.status]}</Badge>
          {deal.company_name && (
            <span className="text-muted-foreground text-sm">{deal.company_name}</span>
          )}
          {deal.expiry_date && (
            <span className="text-muted-foreground text-sm">Ablauf: {formatDate(deal.expiry_date)}</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Deal-Infos</CardTitle>
          <CardDescription className="text-xs">Unternehmen, Volumen, Verantwortliche.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 py-0 text-sm">
          {deal.company_name && <p><strong>Unternehmen:</strong> {deal.company_name}</p>}
          {deal.industry && <p><strong>Branche:</strong> {deal.industry}</p>}
          {deal.volume && <p><strong>Volumen:</strong> {deal.volume}</p>}
          {deal.account_manager_name && <p><strong>Account Manager:</strong> {deal.account_manager_name}</p>}
          {deal.sales_manager_name && <p><strong>Sales Manager:</strong> {deal.sales_manager_name}</p>}
          <p><strong>Sichtbarkeit:</strong> {deal.is_public ? 'Öffentlich (Team)' : 'Privat'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">RFP & Coverage</CardTitle>
          <CardDescription className="text-xs">
            PDF oder DOCX hochladen: Anforderungen extrahieren und passende Referenzen aus eurer Evidence-Bibliothek zuordnen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 py-0">
          <input
            ref={rfpInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleRfpFile(file)
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={rfpAnalyzing}
            onClick={() => rfpInputRef.current?.click()}
          >
            {rfpAnalyzing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 size-4" />
            )}
            {rfpAnalyzing ? 'Analyse läuft …' : 'RFP hochladen (PDF/DOCX)'}
          </Button>
          <p className="text-muted-foreground text-xs">
            Kann je nach Umfang einige Minuten dauern (Einbettungen + Abgleich pro Anforderung).
          </p>

          {rfpResult && (
            <div className="mt-2 max-h-[min(52vh,480px)] space-y-3 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground text-xs">
                Analyse-ID: <code className="text-foreground">{rfpResult.analysisId}</code>
              </p>
              {rfpResult.coverage.map((row) => (
                <div key={row.requirementId} className="rounded border bg-background p-2">
                  <p className="font-medium leading-snug">{row.requirementText}</p>
                  {row.category && (
                    <p className="text-muted-foreground mt-0.5 text-xs">Kategorie: {row.category}</p>
                  )}
                  {row.embedError ? (
                    <p className="text-destructive mt-1 text-xs">{row.embedError}</p>
                  ) : row.matches.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-xs">Keine passenden Referenzen über Schwellenwert.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 border-t pt-2">
                      {row.matches.map((m) => (
                        <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <Link
                            href={`/dashboard/evidence/${m.id}/edit`}
                            className="min-w-0 flex-1 font-medium text-primary hover:underline"
                          >
                            {m.title}
                          </Link>
                          <span className="text-muted-foreground shrink-0">
                            {(m.similarity * 100).toFixed(0)} % Ähnlichkeit
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Verknüpfte Referenzen</CardTitle>
          <CardDescription className="text-xs">Mit diesem Deal verknüpfte Referenzen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-0">
          {deal.references.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Referenzen verknüpft.</p>
          ) : (
            <ul className="space-y-2">
              {deal.references.map((ref) => (
                <li key={ref.id} className="flex items-center gap-2">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <Link href={`/dashboard/evidence/${ref.id}/edit`} className="min-w-0 flex-1 hover:underline truncate text-sm">
                    {ref.title}
                  </Link>
                  <span className="text-muted-foreground text-xs shrink-0">({ref.company_name})</span>
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => handleRemoveReference(ref.id)}>
                    <Trash2Icon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
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
                <PlusCircleIcon className="mr-1 size-4" />
                Verknüpfen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Referenzbedarf melden</CardTitle>
          <CardDescription className="text-xs">
            Keine passende Referenz? Nachricht an den Reference Manager senden.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-0">
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <SendIcon className="mr-2 size-4" />
                Referenzbedarf melden
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Referenzbedarf melden</DialogTitle>
                <DialogDescription>
                  Beschreiben Sie kurz, welche Art von Referenz Sie für diesen Deal benötigen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p><strong>Deal:</strong> {deal.title}</p>
                  {deal.company_name && <p><strong>Unternehmen:</strong> {deal.company_name}</p>}
                  {deal.industry && <p><strong>Branche:</strong> {deal.industry}</p>}
                  {deal.volume && <p><strong>Volumen:</strong> {deal.volume}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref-request-message">Ihre Nachricht *</Label>
                  <Textarea
                    id="ref-request-message"
                    placeholder="z. B. Referenz aus dem Finanzsektor mit Cloud-Migration …"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={sending}>
                  Abbrechen
                </Button>
                <Button onClick={handleSubmitRequest} disabled={sending || !message.trim()}>
                  {sending ? 'Wird gesendet …' : 'Nachricht senden'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
