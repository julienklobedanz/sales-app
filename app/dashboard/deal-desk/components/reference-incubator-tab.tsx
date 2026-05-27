'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Scale,
  Sprout,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'

import { createDraftReferenceFromDeskProject } from '@/app/dashboard/deal-desk/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import { buildHarvestFromAnalysis } from '@/lib/deal-desk/build-harvest-from-snapshot'
import { LEGAL_CLAUSE_ITEMS } from '@/lib/deal-desk/legal-clauses'
import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import { SUCCESS_STORY_KIT, type ReferenceIncubatorHarvest } from '@/lib/deal-desk/reference-incubator-mock'
import { cn } from '@/lib/utils'

const HARVEST_DELAY_MS = 2000

function KitKindBadge({ kind }: { kind: 'pdf' | 'template' | 'guide' }) {
  const label = kind === 'pdf' ? 'PDF' : kind === 'template' ? 'Template' : 'Guide'
  const tone =
    kind === 'pdf'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : kind === 'template'
        ? 'border-purple-200 bg-purple-50 text-purple-700'
        : 'border-slate-200 bg-slate-100 text-slate-700'
  return (
    <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold uppercase', tone)}>
      {label}
    </Badge>
  )
}

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} kopiert.`)
  } catch {
    toast.error('Kopieren fehlgeschlagen.')
  }
}

function PdfResourcesCard() {
  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
            <FileText className="size-4 text-blue-600" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-sm">PDF Ressourcen</CardTitle>
            <CardDescription className="text-xs">
              Vorlagen für Freigabe, NDA und Check-in — zum Download.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {SUCCESS_STORY_KIT.map((item) => (
          <div key={item.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-2 text-left"
              onClick={() => toast.message(`${item.title} — Download (Demo).`)}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <KitKindBadge kind={item.kind} />
                <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                  {item.subtext}
                </p>
              </div>
              <Download className="mt-1 size-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function LegalClauseBuilder() {
  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-50">
            <Scale className="size-4 text-purple-600" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-sm">Legal Clause Builder</CardTitle>
            <CardDescription className="text-xs">
              Klauseln für Vertrag und Marketing — direkt kopieren.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {LEGAL_CLAUSE_ITEMS.map((item) => (
          <div key={item.id} className="space-y-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 border-slate-200 bg-white text-[11px]"
                onClick={() => void copyText(item.title, item.text)}
              >
                <ClipboardCopy className="size-3" aria-hidden />
                Kopieren
              </Button>
            </div>
            <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-600">{item.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function HarvestResult({
  harvest,
  onOpenDraft,
  draftLoading,
}: {
  harvest: ReferenceIncubatorHarvest
  onOpenDraft: () => void
  draftLoading: boolean
}) {
  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
        Auto-Harvest abgeschlossen
      </p>
      <p className="text-sm font-semibold text-slate-900">{harvest.companyName}</p>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Herausforderung
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{harvest.challenge}</p>
        </div>
        <div className="sm:border-l sm:border-slate-100 sm:pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Lösung
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{harvest.solution}</p>
        </div>
      </div>
      <Button
        type="button"
        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        disabled={draftLoading}
        onClick={onOpenDraft}
      >
        {draftLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Referenz-Entwurf öffnen
      </Button>
    </div>
  )
}

export function ReferenceIncubatorTab({
  projectId,
  analysis,
}: {
  projectId: string
  analysis: DealDeskMockAnalysis
}) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')
  const [harvest, setHarvest] = useState<ReferenceIncubatorHarvest | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)

  const preview = useMemo(() => buildHarvestFromAnalysis(analysis), [analysis])

  async function openDraftReference() {
    setDraftLoading(true)
    const res = await createDraftReferenceFromDeskProject(projectId)
    setDraftLoading(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    window.location.href = `${ROUTES.evidence.root}/${res.referenceId}/edit?fromDesk=${projectId}`
  }

  function startHarvest() {
    setPhase('loading')
    window.setTimeout(() => {
      setHarvest(buildHarvestFromAnalysis(analysis))
      setPhase('done')
      toast.success('Case Study aus der RFP-Analyse erstellt.')
    }, HARVEST_DELAY_MS)
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
              <Sprout className="size-4 text-blue-600" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-base">AI Case Study Preview</CardTitle>
              <CardDescription className="text-xs">
                Vorab-Entwurf deiner Success Story — aus dem laufenden Bid.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Basierend auf den RFP-Antworten sind Herausforderung und Lösung bereits vorformuliert.
              Nach &quot;Gewonnen&quot; wird der Entwurf finalisiert.
            </p>

            {phase === 'idle' ? (
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Herausforderung
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800">{preview.challenge}</p>
                </div>
                <div className="sm:border-l sm:border-slate-100 sm:pl-8">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Lösung
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800">{preview.solution}</p>
                </div>
              </div>
            ) : null}

            {phase === 'loading' ? (
              <div className="flex items-center gap-3 py-6 text-sm text-slate-600">
                <Loader2 className="size-5 animate-spin text-emerald-600" aria-hidden />
                RFP-Antworten werden geerntet …
              </div>
            ) : null}

            {phase === 'done' && harvest ? (
              <HarvestResult
                harvest={harvest}
                onOpenDraft={() => void openDraftReference()}
                draftLoading={draftLoading}
              />
            ) : null}
          </div>

          {phase !== 'done' ? (
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={phase === 'loading'}
              onClick={startHarvest}
            >
              {phase === 'loading' ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Trophy className="size-5" aria-hidden />
              )}
              Deal Gewonnen — Harvesting starten
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <aside className="min-w-0 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            The Winning Toolkit
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Ressourcen &amp; Legal</h3>
          <p className="mt-1 text-sm text-slate-600">
            Klauseln, PDFs und Vorlagen — Referenz vertraglich absichern.
          </p>
        </div>

        <LegalClauseBuilder />
        <PdfResourcesCard />

        <Button type="button" variant="outline" size="sm" className="w-full text-xs" asChild>
          <Link href={ROUTES.evidence.root}>Zur Referenz-Datenbank</Link>
        </Button>
      </aside>
    </div>
  )
}
