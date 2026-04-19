'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/lib/icons'
import { matchReferences } from '@/app/dashboard/actions'
import type { MatchReferenceHit } from '@/app/dashboard/actions'

import type { DealWithReferences } from '../types'
import { MatchResultCard } from './match-result-card'
import { ROUTES } from '@/lib/routes'

/** Kontextzeilen für KI-Entwurf (Epic 5 / KAN-128). */
export function buildDealContextForKiEntwurf(deal: DealWithReferences): string {
  const parts = [
    deal.title ? `Deal: ${deal.title}` : null,
    deal.company_name ? `Account: ${deal.company_name}` : null,
    deal.industry ? `Branche: ${deal.industry}` : null,
    deal.volume ? `Volumen: ${deal.volume}` : null,
    deal.requirements_text?.trim() ? `Anforderungen:\n${deal.requirements_text.trim()}` : null,
  ].filter(Boolean)
  return parts.join('\n\n')
}

/** Wireframe §14: Freitext-Match mit Ergebnis-Karten (Score, Snippet, Aktionen). */
export function DealMatchSection({ deal }: { deal: DealWithReferences }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<MatchReferenceHit[] | null>(null)
  const linkedIds = new Set(deal.references.map((r) => r.id))
  const dealContextForKi = buildDealContextForKiEntwurf(deal)

  async function run() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setMatches(null)
    try {
      const res = await matchReferences(q, deal.id, {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Match-Ergebnisse</CardTitle>
        <CardDescription>
          Freitext oder Stichworte – semantische Suche in euren Referenzen mit Ähnlichkeits-Score (Deal-Kontext
          einbezogen).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deal.references.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Zentrale Suche mit vorausgefülltem Deal-Kontext und Verknüpfung ins Deal-Detail.
            </p>
            <Button type="button" asChild className="shrink-0">
              <Link href={ROUTES.matchWithDeal(deal.id)}>Matches finden</Link>
            </Button>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="deal-match-query">Suchtext</Label>
          <Textarea
            id="deal-match-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
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
                dealId={deal.id}
                dealContext={dealContextForKi}
                alreadyLinked={linkedIds.has(m.id)}
                onLinked={() => router.refresh()}
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
