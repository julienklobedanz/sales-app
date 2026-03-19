'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileSearch, UserCheck, Zap, Sparkles, Loader2, ExternalLink } from 'lucide-react'
import {
  runRfpAnalysis,
  getCompanyNews,
  generateBriefing,
  saveExecutiveBriefing,
} from './actions'

type CompanyOption = { id: string; name: string }

type Props = {
  companies: CompanyOption[]
  unreadAlertsCount: number
  execMovementBadge: number
  companyNewsBadge: number
}

export function AiLabClient({
  companies,
  unreadAlertsCount: initialUnread,
  execMovementBadge,
  companyNewsBadge,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <FileSearch className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI RFP Mapper Analyzer & Matcher</CardTitle>
              <CardDescription>
                PDF hochladen: Anforderungen extrahieren und gegen Success Stories matchen. Ergebnisse erscheinen in der Account-Detailansicht unter Proof Points.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RfpMapperCard companies={companies} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <UserCheck className="size-5 text-primary" />
              {companyNewsBadge > 0 && (
                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Relationship Intelligence Assistant</CardTitle>
              <CardDescription>
                Warm Intros und Market Signals: Tipps aus Relationship Map & Executive Tracking; News-Signale zu deinen Accounts mit Top-3-Bulletpoints.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <RelationshipIntelligenceCard companies={companies} />
          <MarketSignalSummarizer companies={companies} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Zap className="size-5 text-primary" />
              {execMovementBadge > 0 && (
                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Executive Tracking & Alert System</CardTitle>
              <CardDescription>
                Watchlist für Trigger-Events (z. B. CIO-Wechsel). Executive Briefing per Knopfdruck aus Name und LinkedIn-URL erzeugen und im Account speichern.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <WatchlistPlaceholder />
          <ExecutiveBriefingForm companies={companies} />
        </CardContent>
      </Card>
    </div>
  )
}

function RfpMapperCard({ companies }: { companies: CompanyOption[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [companyId, setCompanyId] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f?.type === 'application/pdf') setFile(f)
    else toast.error('Bitte nur PDF-Dateien hochladen.')
  }

  const handleAnalyze = () => {
    if (!file) {
      toast.error('Bitte zuerst eine PDF-Datei auswählen.')
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set('file', file)
      if (companyId) formData.set('company_id', companyId)
      const result = await runRfpAnalysis(formData)
      if (result.success) {
        toast.success('RFP analysiert und Matches gespeichert. Sie erscheinen in den Proof Points des Accounts.')
        setFile(null)
      } else toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 bg-muted/30'}`}
      >
        <p className="text-sm text-muted-foreground mb-2">
          PDF hierher ziehen oder klicken zum Auswählen
        </p>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          id="rfp-pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label htmlFor="rfp-pdf" className="cursor-pointer text-sm font-medium text-primary hover:underline">
          Datei auswählen
        </label>
        {file && <p className="mt-2 text-sm font-medium">{file.name}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Account zuordnen (optional)" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAnalyze} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
          Analysieren
        </Button>
      </div>
    </div>
  )
}

function RelationshipIntelligenceCard({ companies }: { companies: CompanyOption[] }) {
  const tips = [
    'Stakeholder X seit 3 Monaten nicht kontaktiert – idealer Zeitpunkt für ein kurzes Update.',
    'Ansprache-Tipp: Fokus auf Business-Value für Rolle Y (Economic Buyer).',
    'Champion in Urlaubsvertretung – kurze Abstimmung mit Stellvertreter empfohlen.',
  ]
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Warm Intros & Tipps</h4>
      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
        {tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-2">Basierend auf Relationship Map und Executive Tracking (Daten später live).</p>
    </div>
  )
}

type NewsItem = {
  id: string
  title: string
  summary: string
  sourceUrl: string
  sourceName: string
  publishedAt: string
}

function MarketSignalSummarizer({ companies }: { companies: CompanyOption[] }) {
  const [loading, setLoading] = useState(false)
  const [byCompany, setByCompany] = useState<Record<string, { companyName: string; topBullets: string[]; items: NewsItem[] }>>({})

  const loadNews = () => {
    if (companies.length === 0) return
    setLoading(true)
    getCompanyNews(companies.slice(0, 10))
      .then((results) => {
        const next: Record<string, { companyName: string; topBullets: string[]; items: NewsItem[] }> = {}
        results.forEach((r) => {
          next[r.companyId] = {
            companyName: r.companyName,
            topBullets: r.topBullets,
            items: r.items,
          }
        })
        setByCompany(next)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Market Signal Summarizer</h4>
      <p className="text-xs text-muted-foreground mb-3">
        Warum sollte Sales jetzt bei Stakeholdern anrufen? Top-3-Bulletpoints pro Account (Quellen anklickbar).
      </p>
      {!loading && Object.keys(byCompany).length === 0 && (
        <Button variant="outline" size="sm" onClick={loadNews}>
          News-Signale laden (simuliert)
        </Button>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Lade News…
        </div>
      )}
      <div className="space-y-4 mt-4">
        {Object.entries(byCompany).map(([companyId, { companyName, topBullets, items }]) => (
          <div key={companyId} className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-2">{companyName}</p>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-left text-sm text-muted-foreground hover:text-foreground space-y-1 block">
                  {topBullets.slice(0, 3).map((b, i) => (
                    <div key={i}>• {b}</div>
                  ))}
                  <span className="text-primary text-xs mt-1 inline-block">Alle Quellen anzeigen →</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] max-h-[360px] overflow-y-auto" align="start">
                <div className="space-y-3">
                  <p className="font-medium text-sm">Alle Meldungen & Quellen</p>
                  {items.map((item) => (
                    <div key={item.id} className="border-b pb-2 last:border-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.summary}</p>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        {item.sourceName} <ExternalLink className="size-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </div>
    </div>
  )
}

function WatchlistPlaceholder() {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Watchlist – Trigger-Events</h4>
      <p className="text-sm text-muted-foreground">
        High-Impact-Alerts (z. B. CIO-Wechsel von Boehringer Ingelheim zu BASF) erscheinen in der Glocke in der Top-Bar und hier. Du wirst so informiert, wenn sich relevante Wechsel ergeben.
      </p>
      <div className="mt-2 rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Aktuell keine neuen Trigger-Events. Alerts werden aus dem AI Lab und externen Quellen gespeist.
      </div>
    </div>
  )
}

function ExecutiveBriefingForm({ companies }: { companies: CompanyOption[] }) {
  const [name, setName] = useState('')
  const [linkedInUrl, setLinkedInUrl] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [result, setResult] = useState<{ summary: string; topPriorities: string; redFlags: string } | null>(null)
  const [generating, startGen] = useTransition()
  const [saving, startSave] = useTransition()

  const handleGenerate = () => {
    if (!name.trim()) {
      toast.error('Bitte einen Namen angeben.')
      return
    }
    startGen(async () => {
      const r = await generateBriefing(name.trim(), linkedInUrl.trim() || null)
      if (r.success) setResult({ summary: r.summary, topPriorities: r.topPriorities, redFlags: r.redFlags })
      else toast.error(r.error)
    })
  }

  const handleSave = () => {
    if (!result || !companyId) {
      toast.error('Bitte Account auswählen und zuerst ein Briefing generieren.')
      return
    }
    startSave(async () => {
      const ok = await saveExecutiveBriefing({
        company_id: companyId,
        name: name.trim(),
        linkedin_url: linkedInUrl.trim() || null,
        summary: result.summary,
        top_priorities: result.topPriorities,
        red_flags: result.redFlags,
      })
      if (ok.success) {
        toast.success('Executive Briefing gespeichert. Erscheint im Account unter Executive Radar.')
        setResult(null)
        setName('')
        setLinkedInUrl('')
      } else toast.error(ok.error)
    })
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">Executive Briefing erstellen</h4>
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Dr. Max Mustermann"
          />
        </div>
        <div>
          <Label>LinkedIn-URL</Label>
          <Input
            value={linkedInUrl}
            onChange={(e) => setLinkedInUrl(e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </div>
        <div>
          <Label>Account (für Speicherung)</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Account wählen" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
            Generieren
          </Button>
          {result && (
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Speichern
            </Button>
          )}
        </div>
      </div>
      {result && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <p><span className="font-medium">Summary:</span> {result.summary}</p>
          <p><span className="font-medium">Top-Prioritäten:</span> {result.topPriorities}</p>
          <p><span className="font-medium">Red Flags:</span> {result.redFlags}</p>
        </div>
      )}
    </div>
  )
}
