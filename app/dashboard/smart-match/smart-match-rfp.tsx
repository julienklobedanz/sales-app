'use client'

/**
 * Smart Match / RFP — upload-first Coverage-Matrix mit Drill-in.
 * Datei → `/api/rfp/coverage` (Extraktion + Anforderungen + Match + LLM-Relevanz-Verdikt).
 *
 * Ehrlichkeit (Proof over Promise): Coverage-Stufe aus dem LLM-Verdikt (deckt ab /
 * teilweise / nein), nicht aus Cosinus allein. Drill-in: Top-Kandidaten je Anforderung,
 * Referenz öffnen / PDF / Share / KI-Antwort, bester Beweis überschreibbar.
 */

import { Fragment, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'
import { createSharedPortfolio } from '@/app/dashboard/actions'
import { PdfExportDialog } from '@/app/dashboard/references/[id]/pdf-export-dialog'
import { KiEntwurfSheet } from '@/app/dashboard/deals/components/ki-entwurf-sheet'

type CoverageMatch = {
  id: string
  title: string
  summary: string | null
  similarity: number
  companyName: string | null
}
type CoverageRow = {
  requirementId: string
  requirementText: string
  category?: string
  matches: CoverageMatch[]
}
type Verdict = { verdict: 'covers' | 'partial' | 'none'; chosenId: string | null; reason: string }
type CoverageResponse =
  | { success: true; fileName: string; coverage: CoverageRow[]; verdicts: Record<string, Verdict> }
  | { success: false; error: string }

const STRONG_CUTOFF = 0.55
const PARTIAL_CUTOFF = 0.47

type Tier = 'strong' | 'partial' | 'gap'
function tierFor(best: CoverageMatch | undefined, verdict?: Verdict): Tier {
  if (verdict) {
    if (verdict.verdict === 'covers') return 'strong'
    if (verdict.verdict === 'partial') return 'partial'
    return 'gap'
  }
  if (!best || best.similarity < PARTIAL_CUTOFF) return 'gap'
  if (best.similarity >= STRONG_CUTOFF) return 'strong'
  return 'partial'
}
function dotsFor(tier: Tier, sim: number): number {
  if (tier === 'gap') return 0
  if (tier === 'strong') return 4
  return sim >= 0.48 ? 3 : 2
}
const TIER_LABEL: Record<Tier, string> = { strong: 'Stark', partial: 'Teilweise', gap: 'Lücke' }

export function SmartMatchRfp() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'idle' | 'loading' | 'result' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null)
  const [pdfRefId, setPdfRefId] = useState<string | null>(null)
  const [ki, setKi] = useState<{ id: string; title: string; score: number; requirement: string } | null>(null)

  async function analyze(file: File) {
    setStep('loading')
    setError(null)
    setExpandedId(null)
    setOverrides({})
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/rfp/coverage', { method: 'POST', body: fd })
      const json = (await res.json()) as CoverageResponse
      if (!json.success) {
        setError(json.error)
        setStep('error')
        return
      }
      setRows(json.coverage)
      setVerdicts(json.verdicts ?? {})
      setStep('result')
    } catch {
      setError('Analyse fehlgeschlagen. Bitte erneut versuchen.')
      setStep('error')
    }
  }

  function pickFile() {
    fileRef.current?.click()
  }

  function bestForRow(r: CoverageRow): CoverageMatch | undefined {
    const ov = overrides[r.requirementId]
    if (ov) {
      const m = r.matches.find((x) => x.id === ov)
      if (m) return m
    }
    const vd = verdicts[r.requirementId]
    if (vd?.chosenId) {
      const m = r.matches.find((x) => x.id === vd.chosenId)
      if (m) return m
    }
    return r.matches[0]
  }

  const infos = rows.map((r) => {
    const vd = verdicts[r.requirementId]
    const best = bestForRow(r)
    return { r, vd, best, tier: tierFor(best, vd) }
  })
  const total = infos.length
  const strong = infos.filter((x) => x.tier === 'strong').length
  const partial = infos.filter((x) => x.tier === 'partial').length
  const gap = infos.filter((x) => x.tier === 'gap').length

  async function share(id: string) {
    setShareLoadingId(id)
    try {
      const res = await createSharedPortfolio([id])
      if (!res.success) {
        toast.error(res.error)
        return
      }
      const abs = typeof window !== 'undefined' ? new URL(res.url, window.location.origin).href : res.url
      await navigator.clipboard.writeText(abs)
      toast.success('Kundenlink in die Zwischenablage kopiert.')
    } finally {
      setShareLoadingId(null)
    }
  }

  function exportSummary() {
    const lines = infos.map(({ r, best, tier }) => {
      if (tier === 'gap') return `• ${r.requirementText} → LÜCKE (keine belastbare Referenz)`
      const tag = tier === 'strong' ? 'stark' : 'teilweise'
      return `• ${r.requirementText} → ${best!.companyName || best!.title} (${Math.round(best!.similarity * 100)}%, ${tag})`
    })
    const text = `RFP-Abdeckung: ${strong} stark, ${partial} teilweise, ${gap} Lücken (${total} Anforderungen)\n\n${lines.join('\n')}`
    void navigator.clipboard.writeText(text)
    toast.success('Antwort-Baustein in die Zwischenablage kopiert.')
  }

  return (
    <section>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.pptx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void analyze(f)
          e.target.value = ''
        }}
      />

      {step === 'idle' || step === 'error' ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="rounded-xl border border-dashed border-input bg-muted/30 p-[30px] text-center text-muted-foreground">
            <span className="mb-2 block text-[26px]">⬆</span>
            Ausschreibung hochladen (PDF, DOCX oder PPTX)
            {step === 'error' && error ? (
              <div className="mx-auto mt-3 max-w-md text-[13px] text-destructive">{error}</div>
            ) : null}
            <div className="mt-4">
              <Button size="sm" onClick={pickFile}>
                {step === 'error' ? 'Andere Datei wählen' : 'Datei wählen & analysieren'}
              </Button>
            </div>
          </div>
        </div>
      ) : step === 'loading' ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="h-[11px] w-[40%] animate-pulse rounded bg-muted" />
          <div className="mt-3 h-[11px] w-[90%] animate-pulse rounded bg-muted" />
          <div className="mt-2 h-[11px] w-[85%] animate-pulse rounded bg-muted" />
          <div className="mt-3 text-[13px] text-muted-foreground">
            Anforderungen werden extrahiert, gematcht und auf echte Abdeckung geprüft …
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <strong className="text-foreground">
                {strong} stark · {partial} teilweise · {gap} {gap === 1 ? 'Lücke' : 'Lücken'}
              </strong>
              <span className="flex h-2.5 w-[220px] overflow-hidden rounded-md bg-muted" title={`${total} Anforderungen`}>
                <span className="h-full bg-primary" style={{ width: `${total ? (strong / total) * 100 : 0}%` }} />
                <span className="h-full bg-primary/40" style={{ width: `${total ? (partial / total) * 100 : 0}%` }} />
              </span>
              <span className="text-muted-foreground">{total} Anf.</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={pickFile}>
                Neues Dokument
              </Button>
              <Button size="sm" onClick={exportSummary}>
                Export
              </Button>
            </div>
          </div>

          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {['Anforderung', 'Bester Beweis', 'Coverage'].map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {infos.map(({ r, vd, best, tier }) => {
                const dots = best ? dotsFor(tier, best.similarity) : 0
                const open = expandedId === r.requirementId
                const bestId = best?.id
                return (
                  <Fragment key={r.requirementId}>
                    <tr className="border-t border-border align-top">
                      <td className={'max-w-[420px] py-2.5 pr-4 ' + (tier === 'gap' ? 'text-destructive' : 'text-foreground')}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : r.requirementId)}
                          className="text-left"
                        >
                          <span className="mr-1 text-muted-foreground">{open ? '▾' : '▸'}</span>
                          {r.requirementText}
                          {tier === 'gap' ? ' ⚠' : ''}
                        </button>
                        {vd?.reason ? (
                          <div className="mt-0.5 pl-3.5 text-[11.5px] text-muted-foreground">{vd.reason}</div>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4">
                        {tier === 'gap' ? (
                          <span className="text-muted-foreground">— keine passende Referenz</span>
                        ) : (
                          <span className="text-foreground">{best!.companyName || best!.title}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2.5">
                        <span className={'font-medium ' + (tier === 'gap' ? 'text-destructive' : 'text-primary')}>
                          {TIER_LABEL[tier]}
                        </span>
                        &nbsp;
                        <span className="text-[11px] tracking-widest">
                          {[0, 1, 2, 3].map((d) => (
                            <span key={d} className={d < dots ? 'text-primary' : 'text-muted-foreground/40'}>
                              ●
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>

                    {open ? (
                      <tr className="border-t border-border/60">
                        <td colSpan={3} className="bg-muted/30 px-3 py-3">
                          {tier === 'gap' ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                                <span>Keine Referenz deckt diese Anforderung belastbar ab.</span>
                                <Button variant="outline" size="xs" onClick={() => toast.success('Referenz angefragt (folgt)')}>
                                  Referenz anfragen
                                </Button>
                              </div>
                              {r.matches.length ? (
                                <div className="px-1">
                                  <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                    Nächste Treffer (decken die Anforderung nicht ab)
                                  </div>
                                  <div className="space-y-0.5">
                                    {r.matches.slice(0, 3).map((m) => (
                                      <Link
                                        key={m.id}
                                        href={ROUTES.references.detail(m.id)}
                                        target="_blank"
                                        className="block text-[12.5px] text-muted-foreground hover:underline"
                                      >
                                        {m.companyName || m.title}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {r.matches.slice(0, 3).map((m) => {
                                const isBest = m.id === bestId
                                return (
                                  <div
                                    key={m.id}
                                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <Link
                                          href={ROUTES.references.detail(m.id)}
                                          target="_blank"
                                          className="font-medium text-foreground hover:underline"
                                        >
                                          {m.companyName || m.title}
                                        </Link>
                                        {isBest ? (
                                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                            Antwort
                                          </span>
                                        ) : null}
                                      </div>
                                      {m.summary ? (
                                        <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">
                                          {m.summary}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {!isBest ? (
                                        <Button
                                          variant="outline"
                                          size="xs"
                                          onClick={() =>
                                            setOverrides((o) => ({ ...o, [r.requirementId]: m.id }))
                                          }
                                        >
                                          Als Antwort
                                        </Button>
                                      ) : null}
                                      <Button variant="outline" size="xs" onClick={() => setPdfRefId(m.id)}>
                                        PDF
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        disabled={shareLoadingId === m.id}
                                        onClick={() => void share(m.id)}
                                      >
                                        {shareLoadingId === m.id ? 'Link …' : 'Share'}
                                      </Button>
                                      <Button
                                        size="xs"
                                        onClick={() =>
                                          setKi({
                                            id: m.id,
                                            title: m.title,
                                            score: m.similarity,
                                            requirement: r.requirementText,
                                          })
                                        }
                                      >
                                        KI-Antwort
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {gap > 0 ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13.5px] text-destructive">
              <span>
                ⚠ {gap} {gap === 1 ? 'Anforderung ohne belastbare Referenz' : 'Anforderungen ohne belastbare Referenz'}
              </span>
              <Button variant="outline" size="sm" onClick={() => toast.success('Referenzen angefragt (folgt)')}>
                Referenzen anfragen
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {pdfRefId ? (
        <PdfExportDialog
          referenceId={pdfRefId}
          open={pdfRefId !== null}
          onOpenChange={(o) => {
            if (!o) setPdfRefId(null)
          }}
          showTriggerButton={false}
        />
      ) : null}

      {ki ? (
        <KiEntwurfSheet
          open={ki !== null}
          onOpenChange={(o) => {
            if (!o) setKi(null)
          }}
          referenceId={ki.id}
          referenceTitle={ki.title}
          matchScore={ki.score}
          dealId={null}
          dealContext={`Anforderung aus Ausschreibung:\n${ki.requirement}`}
        />
      ) : null}
    </section>
  )
}
