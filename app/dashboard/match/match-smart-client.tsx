'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { matchReferences, type MatchReferenceHit } from '@/app/dashboard/actions'
import { MatchResultCard } from '@/app/dashboard/deals/components/match-result-card'
import { buildDealContextForKiEntwurf } from '@/app/dashboard/deals/components/deal-match-section'
import type { DealWithReferences } from '@/app/dashboard/deals/types'

function buildDefaultQuery(deal: DealWithReferences | null): string {
  if (!deal) return ''
  const parts = [
    deal.title,
    deal.industry?.trim() || null,
    deal.volume?.trim() || null,
    deal.requirements_text?.trim() || null,
  ].filter(Boolean)
  return parts.join('\n').slice(0, 3500)
}

export function MatchSmartClient({ initialDeal }: { initialDeal: DealWithReferences | null }) {
  const router = useRouter()
  const defaultQuery = useMemo(() => buildDefaultQuery(initialDeal), [initialDeal])
  const [query, setQuery] = useState(defaultQuery)
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<MatchReferenceHit[] | null>(null)

  const dealContext = initialDeal ? buildDealContextForKiEntwurf(initialDeal) : null
  const linkedIds = useMemo(
    () => new Set(initialDeal?.references.map((r) => r.id) ?? []),
    [initialDeal]
  )

  async function run() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setMatches(null)
    try {
      const res = await matchReferences(q, initialDeal?.id, {
        matchCount: 10,
        matchThreshold: 0.65,
        rerank: false,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setMatches(res.matches)
    } finally {
      setLoading(false)
    }
  }

  function afterLinked() {
    if (initialDeal?.id) router.push(ROUTES.deals.detail(initialDeal.id))
    else router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Intelligente Suche</CardTitle>
        <CardDescription>
          {initialDeal
            ? `Kontext: „${initialDeal.title}“. Treffer können mit dem Deal verknüpft werden.`
            : 'Freitext oder Stichworte – semantische Suche in euren Referenzen.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="match-smart-query">Suchtext</Label>
          <Textarea
            id="match-smart-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            placeholder="z. B. Cloud Landing Zone, SAP Migration, ISO 27001 …"
          />
        </div>
        <Button type="button" onClick={() => void run()} disabled={loading || !query.trim()}>
          {loading ? (
            'Suche …'
          ) : (
            <>
              <AppIcon icon={Search01Icon} size={16} className="mr-2" />
              Suchen
            </>
          )}
        </Button>

        {matches && matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((m) => (
              <MatchResultCard
                key={m.id}
                hit={m}
                dealId={initialDeal?.id}
                dealContext={dealContext}
                alreadyLinked={initialDeal ? linkedIds.has(m.id) : false}
                onLinked={afterLinked}
              />
            ))}
          </div>
        ) : matches && matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Treffer für diese Anfrage.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
