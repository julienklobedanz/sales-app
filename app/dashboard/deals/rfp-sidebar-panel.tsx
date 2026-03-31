'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, FileSearch, FileUp, Pencil, PlusCircleIcon, Trophy, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { DealStatus, DealWithReferences } from './types'
import { addReferenceToDeal, addReferenceToDealWithScore, recordDealOutcome, updateDeal } from './actions'
import { matchReferences } from '@/app/dashboard/actions'

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
          {analyzing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}
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

function EditDealDialog({
  deal,
  companies,
  orgProfiles,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(deal.title)
  const [companyId, setCompanyId] = useState(deal.company_id ?? '')
  const [industry, setIndustry] = useState(deal.industry ?? '')
  const [volume, setVolume] = useState(deal.volume ?? '')
  const [status, setStatus] = useState<DealStatus>(deal.status)
  const [expiry, setExpiry] = useState(deal.expiry_date ?? '')
  const [isPublic, setIsPublic] = useState(Boolean(deal.is_public))
  const [amId, setAmId] = useState(deal.account_manager_id ?? '')
  const [smId, setSmId] = useState(deal.sales_manager_id ?? '')
  const [requirements, setRequirements] = useState(deal.requirements_text ?? '')

  async function submit() {
    setSaving(true)
    try {
      const res = await updateDeal({
        id: deal.id,
        title,
        company_id: companyId || null,
        industry: industry.trim() || null,
        volume: volume.trim() || null,
        status,
        expiry_date: expiry || null,
        is_public: isPublic,
        account_manager_id: amId || null,
        sales_manager_id: smId || null,
        requirements_text: requirements.trim() || null,
        incumbent_provider: deal.incumbent_provider ?? null,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Konnte Deal nicht speichern.')
        return
      }
      toast.success('Deal gespeichert.')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full">
          <Pencil className="mr-2 size-4" />
          Bearbeiten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deal bearbeiten</DialogTitle>
          <DialogDescription>Alle Angaben aus der Deal-Erstellung.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Titel *</Label>
            <Input id="deal-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Unternehmen</Label>
            <Select value={companyId || '__none__'} onValueChange={(v) => setCompanyId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Keins —</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-industry">Branche</Label>
              <Input id="deal-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-volume">Volumen</Label>
              <Input id="deal-volume" value={volume} onChange={(e) => setVolume(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="rfp">RFP</SelectItem>
                  <SelectItem value="negotiation">Verhandlung</SelectItem>
                  <SelectItem value="won">Gewonnen</SelectItem>
                  <SelectItem value="lost">Verloren</SelectItem>
                  <SelectItem value="withdrawn">Zurückgezogen</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-expiry">Ablaufdatum</Label>
              <Input id="deal-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sichtbarkeit</Label>
            <Select value={isPublic ? 'public' : 'private'} onValueChange={(v) => setIsPublic(v === 'public')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Öffentlich (Team)</SelectItem>
                <SelectItem value="private">Privat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Manager</Label>
              <Select value={amId || '__none__'} onValueChange={(v) => setAmId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales Manager</Label>
              <Select value={smId || '__none__'} onValueChange={(v) => setSmId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-req">Anforderungen</Label>
            <Textarea id="deal-req" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={7} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !title.trim()}>
            {saving ? 'Speichern …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LinkReferenceDialog({
  dealId,
  availableRefs,
}: {
  dealId: string
  availableRefs: Array<{ id: string; title: string; company_name: string }>
}) {
  const [open, setOpen] = useState(false)
  const [refId, setRefId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!refId) return
    setSaving(true)
    try {
      const res = await addReferenceToDeal(dealId, refId)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Referenz verknüpft.')
        setOpen(false)
        setRefId('')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full" disabled={availableRefs.length === 0}>
          <PlusCircleIcon className="mr-2 size-4" />
          Referenz verknüpfen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Referenz verknüpfen</DialogTitle>
          <DialogDescription>Manuell eine Referenz mit diesem Deal verbinden.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Referenz</Label>
          <Select value={refId || '__none__'} onValueChange={(v) => setRefId(v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen …" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {availableRefs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title} ({r.company_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !refId}>
            {saving ? 'Verknüpfen …' : 'Verknüpfen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FindMatchesDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<Array<{ id: string; title: string; summary: string | null; similarity: number }> | null>(null)

  async function run() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setMatches(null)
    try {
      const res = await matchReferences(q, dealId, { matchCount: 10, matchThreshold: 0.6, rerank: false })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setMatches(res.matches.map((m) => ({ id: m.id, title: m.title, summary: m.summary, similarity: m.similarity })))
    } finally {
      setLoading(false)
    }
  }

  async function link(m: { id: string; similarity: number }) {
    const res = await addReferenceToDealWithScore({ dealId, referenceId: m.id, similarityScore: m.similarity })
    if (!res.success) toast.error(res.error ?? 'Konnte Referenz nicht verknüpfen.')
    else toast.success('Referenz übernommen.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="w-full">
          <FileSearch className="mr-2 size-4" />
          Matches finden
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Passende Referenzen finden</DialogTitle>
          <DialogDescription>Freitext eingeben – wir suchen semantisch in euren Referenzen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="match-query">Suchtext</Label>
            <Textarea id="match-query" value={query} onChange={(e) => setQuery(e.target.value)} rows={4} placeholder="z. B. Cloud Landing Zone, SAP Migration, ISO27001 …" />
          </div>
          <Button onClick={run} disabled={loading || !query.trim()}>
            {loading ? 'Suche …' : 'Suchen'}
          </Button>

          {matches?.length ? (
            <div className="space-y-2 max-h-[52vh] overflow-y-auto rounded-md border p-3">
              {matches.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    {m.summary ? <div className="text-sm text-muted-foreground line-clamp-2">{m.summary}</div> : null}
                    <div className="text-xs text-muted-foreground mt-1">{(m.similarity * 100).toFixed(0)}% Ähnlichkeit</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => link({ id: m.id, similarity: m.similarity })}>
                    In Deal übernehmen
                  </Button>
                </div>
              ))}
            </div>
          ) : matches && matches.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Treffer.</div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OutcomeDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<'won' | 'lost' | 'withdrawn' | ''>('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!outcome) return
    setSaving(true)
    try {
      const res = await recordDealOutcome({ dealId, outcome: outcome as any, comment })
      if (!res.success) {
        toast.error(res.error ?? 'Konnte Ausgang nicht speichern.')
        return
      }
      toast.success('Ausgang gespeichert.')
      setOpen(false)
      setOutcome('')
      setComment('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full">
          <Trophy className="mr-2 size-4" />
          Ausgang festhalten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ausgang des Deals</DialogTitle>
          <DialogDescription>Kurz festhalten, wie der Deal ausgegangen ist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Ausgang</Label>
            <Select value={outcome || '__none__'} onValueChange={(v) => setOutcome(v === '__none__' ? '' : (v as any))}>
              <SelectTrigger>
                <SelectValue placeholder="Auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="won">Gewonnen</SelectItem>
                <SelectItem value="lost">Verloren</SelectItem>
                <SelectItem value="withdrawn">Zurückgezogen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="outcome-comment">Kommentar (optional)</Label>
            <Textarea id="outcome-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !outcome}>
            {saving ? 'Speichern …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

