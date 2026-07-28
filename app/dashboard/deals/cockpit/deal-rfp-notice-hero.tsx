import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { DealWithReferences } from '../types'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

function overviewParagraphs(briefing: DealDeskExecutiveBriefingFields): string[] {
  const raw =
    briefing.projectOverviewPlain?.trim() ||
    briefing.strategicAssessment?.trim() ||
    ''
  if (!raw) return []
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function DealRfpNoticeHero({
  deal,
  data,
}: {
  deal: DealWithReferences
  data: DealRfpCockpitData
}) {
  const briefing = data.executiveBriefing
  const paragraphs = overviewParagraphs(briefing)
  const metaParts = [
    deal.company_name,
    briefing.expectedDealVolume,
    briefing.projectLocation,
  ].filter((v): v is string => Boolean(v && String(v).trim()))

  if (paragraphs.length === 0 && metaParts.length === 0 && briefing.domainTags.length === 0) {
    return null
  }

  return (
    <Card id="notice-hero" className="border-border/80 bg-muted/20">
      <CardContent className="space-y-3 py-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{deal.title}</h2>
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
        {paragraphs.length > 0 ? (
          <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
            {paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
