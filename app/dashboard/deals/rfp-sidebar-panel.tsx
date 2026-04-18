'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'

import type { DealWithReferences } from './types'
import { EditDealDialog } from './components/edit-deal-dialog'
import { LinkReferenceDialog } from './components/link-reference-dialog'
import { OutcomeDialog } from './components/outcome-dialog'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

/**
 * Kompakte Aktionen in der Sidebar. RFP-Analyse und Match-Ergebnisse liegen in der Hauptspalte (Wireframe §13–14).
 */
export function RfpSidebarPanel({
  deal,
  companies,
  orgProfiles,
  allReferences,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  allReferences: Array<{ id: string; title: string; company_name: string }>
}) {
  const availableRefs = allReferences.filter((r) => !deal.references.some((d) => d.id === r.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktionen</CardTitle>
        <CardDescription>Bearbeiten, Referenzen und Outcome.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <EditDealDialog deal={deal} companies={companies} orgProfiles={orgProfiles} />

        <LinkReferenceDialog dealId={deal.id} availableRefs={availableRefs} />

        <OutcomeDialog dealId={deal.id} />

        <Button asChild size="sm" className="w-full">
          <Link href={`${ROUTES.deals.requestNew}?dealId=${encodeURIComponent(deal.id)}`}>
            Referenzbedarf melden
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
