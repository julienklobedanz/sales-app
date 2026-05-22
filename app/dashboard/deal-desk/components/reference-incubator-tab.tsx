'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Sprout,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import {
  buildReferenceIncubatorHarvest,
  SUCCESS_STORY_KIT,
  type ReferenceIncubatorHarvest,
} from '@/lib/deal-desk/reference-incubator-mock'
import { cn } from '@/lib/utils'

const HARVEST_DELAY_MS = 2000

function KitKindBadge({ kind }: { kind: 'pdf' | 'template' | 'guide' }) {
  const label = kind === 'pdf' ? 'PDF' : kind === 'template' ? 'Template' : 'Guide'
  return (
    <Badge variant="outline" className="shrink-0 text-[10px] font-semibold uppercase">
      {label}
    </Badge>
  )
}

function HarvestPreview({
  harvest,
  onReview,
}: {
  harvest: ReferenceIncubatorHarvest
  onReview: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <MessageSquare className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            RefStack KI
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-950/90 dark:text-emerald-50/90">
            🎉 Herzlichen Glückwunsch zum Deal! Ich habe aus deinen RFP-Antworten und dem Strategischen
            Account-Board bereits 80% der Case Study vorgeschrieben. Schick sie in 6 Monaten an den Kunden
            zur Logo-Freigabe.
          </p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account-Vorschau (Auto-Harvest)</CardTitle>
          <CardDescription>Metadaten simuliert via Brandfetch — Entwurf aus RFP-Kontext.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg font-bold text-muted-foreground">
              {harvest.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-lg font-semibold text-foreground">{harvest.companyName}</p>
              <p className="text-sm text-muted-foreground">{harvest.website}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary">{harvest.industry}</Badge>
                <Badge variant="outline">{harvest.headquarters}</Badge>
                <Badge variant="outline">{harvest.employeeCount} MA</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Herausforderung
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{harvest.challenge}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lösung & Setup
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{harvest.solution}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Projekt-Details / ICP
              </p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Branche</dt>
                  <dd className="font-medium text-foreground">{harvest.projectIndustry}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Dauer</dt>
                  <dd className="font-medium text-foreground">{harvest.projectDuration}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Volumen</dt>
                  <dd className="font-medium text-foreground">{harvest.projectVolume}</dd>
                </div>
              </dl>
            </div>
          </div>

          <Button type="button" className="w-full gap-2 sm:w-auto" asChild>
            <Link href={ROUTES.evidence.root} onClick={onReview}>
              Zur Referenz-Datenbank wechseln & Review starten
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function ReferenceIncubatorTab({ customerName }: { customerName: string }) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')
  const [harvest, setHarvest] = useState<ReferenceIncubatorHarvest | null>(null)

  function startHarvest() {
    setPhase('loading')
    window.setTimeout(() => {
      setHarvest(buildReferenceIncubatorHarvest(customerName))
      setPhase('done')
      toast.success('Case Study aus RFP-Kontext vorgeschrieben (Demo).')
    }, HARVEST_DELAY_MS)
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,65%)_minmax(0,35%)] lg:items-stretch">
      <div className="flex min-w-0 flex-col space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Auto-Harvesting Engine
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gewonnenen Deal in eine erste Success Story überführen.
            </p>
          </div>
          {phase !== 'done' ? (
            <Button
              type="button"
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={phase === 'loading'}
              onClick={startHarvest}
            >
              {phase === 'loading' ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Trophy className="size-5" aria-hidden />
              )}
              Deal Gewonnen — Auto-Harvesting starten
            </Button>
          ) : null}
        </div>

        {phase === 'idle' ? (
          <Card className="flex flex-1 flex-col border-dashed border-border/80 bg-muted/20">
            <CardContent className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <Sprout className="size-10 text-emerald-600/80" aria-hidden />
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                Nach dem Gewinn startet die KI einen Entwurf aus RFP-Antworten, Account-Board und
                Projektmetadaten — ohne manuelle Nacharbeit am ersten Tag.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {phase === 'loading' ? (
          <Card className="flex flex-1 flex-col border-border/80">
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="size-10 animate-spin text-emerald-600" aria-hidden />
              <p className="text-sm font-medium text-foreground">RFP-Antworten werden geerntet …</p>
              <p className="text-xs text-muted-foreground">Account-Board · Case Study · ICP-Felder</p>
            </CardContent>
          </Card>
        ) : null}

        {phase === 'done' && harvest ? (
          <HarvestPreview
            harvest={harvest}
            onReview={() => toast.success('Review in der Referenz-Datenbank (Demo).')}
          />
        ) : null}
      </div>

      <aside className="flex min-w-0 flex-col space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Success Story Kit
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Ressourcen & Legal-Framework</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Juristische Absicherung und Vorlagen für Logo-Freigabe und Referenznutzung.
          </p>
        </div>

        <ul className="space-y-3">
          {SUCCESS_STORY_KIT.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors',
                  'hover:border-slate-300 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
                )}
                onClick={() => toast.message(`${item.title} — Download (Demo).`)}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                  <FileText className="size-5 text-slate-600 dark:text-slate-300" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <KitKindBadge kind={item.kind} />
                  <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.subtext}</p>
                </div>
                <Download
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
