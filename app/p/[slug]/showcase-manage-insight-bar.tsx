import { Eye } from 'lucide-react'

export type ManageInsightSummary = {
  viewCount: number
  lastViewLabel: string | null
}

export function ShowcaseManageInsightBar({ insights }: { insights: ManageInsightSummary }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border/60 bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
        <Eye className="size-3.5 shrink-0 opacity-70" aria-hidden />
        {insights.viewCount.toLocaleString('de-DE')} Aufrufe
      </span>
      {insights.lastViewLabel ? (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span>{insights.lastViewLabel}</span>
        </>
      ) : (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span>Noch keine Empfänger-Ansicht erfasst</span>
        </>
      )}
    </div>
  )
}

export function formatManageLastViewLabel(input: {
  countryCode: string | null
  activeSeconds: number
  startedAtIso: string
}): string {
  const country = input.countryCode?.trim().toUpperCase() || '—'
  const mins = Math.max(1, Math.round(input.activeSeconds / 60))
  const started = new Date(input.startedAtIso)
  const agoMin = Math.max(0, Math.round((Date.now() - started.getTime()) / 60_000))
  const agoLabel =
    agoMin < 60 ? `vor ${agoMin} Min` : `vor ${Math.round(agoMin / 60)} Std`
  return `Letzte Ansicht aus ${country} · ${mins} Min · ${agoLabel}`
}
