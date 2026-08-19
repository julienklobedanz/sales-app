import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { DealWithReferences } from '../types'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { COPY } from '@/lib/copy'

function executiveBullets(briefing: DealDeskExecutiveBriefingFields): string[] {
  const fromTakeaways = (briefing.keyTakeaways ?? []).map((t) => t.trim()).filter(Boolean)
  if (fromTakeaways.length > 0) {
    return fromTakeaways.slice(0, 7)
  }
  const raw =
    briefing.strategicAssessment?.trim() || briefing.projectOverviewPlain?.trim() || ''
  if (!raw) return []
  const lines = raw
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-–*]+/, '').trim())
    .filter(Boolean)
  if (lines.length >= 2) return lines.slice(0, 7)
  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
  return sentences.slice(0, 7)
}

export function DealRfpNoticeHero({
  deal,
  data,
}: {
  deal: DealWithReferences
  data: DealRfpCockpitData
}) {
  const briefing = data.executiveBriefing
  const bullets = executiveBullets(briefing)
  const metaParts = [
    deal.company_name,
    briefing.expectedDealVolume,
    briefing.projectLocation,
  ].filter((v): v is string => Boolean(v && String(v).trim()))

  if (
    bullets.length === 0 &&
    metaParts.length === 0 &&
    briefing.domainTags.length === 0
  ) {
    return (
      <Card id="notice-hero" className="border-border/80">
        <CardContent className="py-5">
          <p className="text-sm text-muted-foreground">
            {COPY.deals.cockpit.steckbriefEmpty}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id="notice-hero" className="border-border/80">
      <CardContent className="space-y-3 py-5">
        <div>
          <CardTitle className="text-base tracking-tight">{deal.title}</CardTitle>
          {metaParts.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{metaParts.join(' · ')}</p>
          ) : null}
        </div>
        {briefing.domainTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {briefing.domainTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px] font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        {bullets.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {COPY.deals.cockpit.noticeExecutiveSummaryTitle}
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90">
              {bullets.map((b) => (
                <li key={b.slice(0, 64)}>{b}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
