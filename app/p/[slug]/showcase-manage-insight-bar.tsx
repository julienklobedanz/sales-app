import { Eye } from 'lucide-react'

import { formatReferenceDate } from '@/lib/format'

export type ManageInsightSummary = {
  viewCount: number
  lastViewLabel: string | null
  linkExpiresLabel: string | null
}

export type ManageApprovalStatusSummary = {
  approvedSinceLabel: string | null
  isAnonymous: boolean | null
}

/** ISO-3166 alpha-2 → Flaggen-Emoji (sonst Globus). */
export function countryCodeToFlagEmoji(countryCode: string | null | undefined): string {
  const cc = countryCode?.trim().toUpperCase() ?? ''
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐'
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)))
}

export function formatActiveDurationDe(activeSeconds: number): string {
  const total = Math.max(0, Math.floor(activeSeconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins} Min. ${secs} Sek.`
}

export function formatRelativeAgoDe(
  startedAtIso: string,
  nowMs: number = Date.now(),
): string {
  const started = new Date(startedAtIso)
  if (Number.isNaN(started.getTime())) return 'vor Kurzem'
  const agoMin = Math.max(0, Math.round((nowMs - started.getTime()) / 60_000))
  if (agoMin < 60) return `vor ${agoMin} Min`
  const agoHours = Math.round(agoMin / 60)
  if (agoHours < 48) return `vor ${agoHours} Std`
  const agoDays = Math.round(agoHours / 24)
  return `vor ${agoDays} ${agoDays === 1 ? 'Tag' : 'Tagen'}`
}

export function formatManageLastViewLabel(input: {
  countryCode: string | null
  activeSeconds: number
  startedAtIso: string
}): string {
  const flag = countryCodeToFlagEmoji(input.countryCode)
  const duration = formatActiveDurationDe(input.activeSeconds)
  const ago = formatRelativeAgoDe(input.startedAtIso)
  return `Letzte Ansicht aus ${flag} (${duration}) · ${ago}`
}

export function formatManageLinkExpiresLabel(
  expiresAtIso: string | null | undefined,
): string | null {
  if (!expiresAtIso?.trim()) return null
  const d = new Date(expiresAtIso)
  if (Number.isNaN(d.getTime())) return null
  return `Gültig bis ${formatReferenceDate(d.toISOString(), 'de-DE')}`
}

export function formatManageApprovedSinceLabel(
  respondedAtIso: string | null | undefined,
): string | null {
  if (!respondedAtIso?.trim()) return null
  const d = new Date(respondedAtIso)
  if (Number.isNaN(d.getTime())) return null
  return `Freigegeben seit ${formatReferenceDate(d.toISOString(), 'de-DE')}`
}

export function ShowcaseManageInsightBar({
  insights,
}: {
  insights: ManageInsightSummary
}) {
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
      ) : null}
      {insights.linkExpiresLabel ? (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span>{insights.linkExpiresLabel}</span>
        </>
      ) : (
        <>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <span>Ohne Ablaufdatum</span>
        </>
      )}
    </div>
  )
}
