'use client'

import { useMemo, useState } from 'react'
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Scale,
} from 'lucide-react'
import { toast } from 'sonner'

import { createDraftReferenceFromDeskProject } from '@/app/dashboard/deal-desk/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import { buildHarvestFromAnalysis } from '@/lib/deal-desk/build-harvest-from-snapshot'
import { LEGAL_CLAUSE_ITEMS } from '@/lib/deal-desk/legal-clauses'
import {
  buildCaseStudySolutionBullets,
  buildCustomerChallengeBullets,
} from '@/lib/deal-desk/reference-case-study-bullets'
import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import { SUCCESS_STORY_KIT, type ReferenceIncubatorHarvest } from '@/lib/deal-desk/reference-incubator-mock'
import { cn } from '@/lib/utils'

const HARVEST_DELAY_MS = 2000

function IncubatorSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm leading-snug text-slate-600">{description}</p>
      ) : null}
    </div>
  )
}

function CaseStudyBulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((item, idx) => (
        <li key={`${idx}-${item.slice(0, 24)}`} className="flex gap-2">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

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

async function downloadKitPdf(path: string, title: string) {
  try {
    const res = await fetch(path, { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(
        typeof (err as { error?: string }).error === 'string'
          ? (err as { error: string }).error
          : 'Download fehlgeschlagen.'
      )
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'Dokument.pdf'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${title} heruntergeladen.`)
  } catch {
    toast.error('Download fehlgeschlagen.')
  }
}

function PdfTemplates({ isDemoMode }: { isDemoMode: boolean }) {
  if (!isDemoMode) {
    return (
      <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="size-4 text-blue-600" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-sm">PDF Templates</CardTitle>
              <CardDescription className="text-xs">
                Vorlagen stehen nach einer echten KI-Analyse zur Verfügung.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
            <FileText className="size-4 text-blue-600" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-sm">PDF Templates</CardTitle>
            <CardDescription className="text-xs">
              Vorlagen für Freigabe, NDA und Check-in
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-slate-100">
        {SUCCESS_STORY_KIT.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <KitKindBadge kind={item.kind} />
              <p className="text-xs font-semibold text-slate-900">{item.title}</p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-600">
                {item.subtext}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-slate-500 hover:text-slate-900"
              aria-label={`${item.title} herunterladen`}
              title={item.downloadPath ? 'PDF herunterladen' : 'Download (Demo)'}
              onClick={() => {
                if (item.downloadPath) {
                  void downloadKitPdf(item.downloadPath, item.title)
                  return
                }
                toast.message(`${item.title} — Download (Demo).`)
              }}
            >
              <Download className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function LegalTemplates() {
  return (
    <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-50">
            <Scale className="size-4 text-purple-600" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-sm">Legal Templates</CardTitle>
            <CardDescription className="text-xs">
              Template Klauseln zur Referenznutzung für den Vertrag mit Ihrem Kunden
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 divide-y divide-slate-100">
        {LEGAL_CLAUSE_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <p className="min-w-0 text-xs font-semibold leading-snug text-slate-900">{item.title}</p>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${item.title} kopieren`}
              title="Klausel kopieren"
              onClick={() => void copyText(item.title, item.text)}
            >
              <Copy className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function HarvestResult({
  harvest,
  analysis,
  onOpenDraft,
  draftLoading,
}: {
  harvest: ReferenceIncubatorHarvest
  analysis: DealDeskMockAnalysis
  onOpenDraft: () => void
  draftLoading: boolean
}) {
  const challengeBullets = useMemo(() => buildCustomerChallengeBullets(analysis), [analysis])
  const solutionBullets = useMemo(
    () => buildCaseStudySolutionBullets(analysis, harvest.solution),
    [analysis, harvest.solution]
  )

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
        Auto-Harvest abgeschlossen
      </p>
      <p className="text-sm font-semibold text-slate-900">{harvest.companyName}</p>
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Herausforderung
          </p>
          <div className="mt-2">
            <CaseStudyBulletList items={challengeBullets} />
          </div>
        </div>
        <div className="sm:border-l sm:border-slate-100 sm:pl-8">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Lösung
          </p>
          <div className="mt-2">
            <CaseStudyBulletList items={solutionBullets} />
          </div>
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
  isDemoMode = false,
}: {
  projectId: string
  analysis: DealDeskMockAnalysis
  isDemoMode?: boolean
}) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')
  const [harvest, setHarvest] = useState<ReferenceIncubatorHarvest | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)

  const preview = useMemo(() => buildHarvestFromAnalysis(analysis), [analysis])
  const previewChallengeBullets = useMemo(() => buildCustomerChallengeBullets(analysis), [analysis])
  const previewSolutionBullets = useMemo(
    () => buildCaseStudySolutionBullets(analysis, preview.solution),
    [analysis, preview.solution]
  )

  async function openDraftReference() {
    setDraftLoading(true)
    const res = await createDraftReferenceFromDeskProject(projectId)
    setDraftLoading(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success('Entwurf angelegt — bitte prüfen, speichern, dann Freigabe in der Detailansicht starten.')
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
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-4">
      <div className="flex flex-col justify-end lg:col-span-5">
        <IncubatorSectionHeading
          eyebrow="The Winning Toolkit"
          title="Ressourcen & Legal"
        />
      </div>
      <div className="flex flex-col justify-end lg:col-span-7">
        <IncubatorSectionHeading eyebrow="Success Story" title="AI Case Study Preview" />
      </div>

      <aside className="flex min-w-0 flex-col gap-4 lg:col-span-5">
        <LegalTemplates />
        <PdfTemplates isDemoMode={isDemoMode} />
      </aside>

      <div className="min-w-0 lg:col-span-7">
        <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6">
            <p className="m-0 text-sm leading-relaxed text-slate-600">
              Basierend auf dem RFP sind Herausforderung und Lösung bereits vorformuliert. Ein Klick auf Deal gewonnen legt diesen Deal als Referenzentwurf an.
            </p>

            <div className="space-y-4">
              {phase === 'idle' ? (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Herausforderung
                    </p>
                    <div className="mt-2">
                      <CaseStudyBulletList items={previewChallengeBullets} />
                    </div>
                  </div>
                  <div className="sm:border-l sm:border-slate-100 sm:pl-8">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Lösung
                    </p>
                    <div className="mt-2">
                      <CaseStudyBulletList items={previewSolutionBullets} />
                    </div>
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
                  analysis={analysis}
                  onOpenDraft={() => void openDraftReference()}
                  draftLoading={draftLoading}
                />
              ) : null}
            </div>

            {phase !== 'done' ? (
              <Button
                type="button"
                className="h-auto w-full bg-emerald-600 py-4 text-sm font-medium hover:bg-emerald-700"
                disabled={phase === 'loading'}
                onClick={startHarvest}
              >
                {phase === 'loading' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Deal Gewonnen — Harvesting starten
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
