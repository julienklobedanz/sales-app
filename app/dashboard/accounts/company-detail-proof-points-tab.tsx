import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CompanyDetailCompany } from './company-detail-types'
import type { CompanyRefRow } from './actions'
import { referenceStatusLabel } from './company-detail-constants'
import { ROUTES } from '@/lib/routes'

function matchScore(params: {
  companyIndustry: string | null
  companyHq: string | null
  refIndustry: string | null
  refCountry: string | null
}): number {
  const ci = (params.companyIndustry ?? '').trim().toLowerCase()
  const ri = (params.refIndustry ?? '').trim().toLowerCase()
  const ch = (params.companyHq ?? '').trim().toLowerCase()
  const rc = (params.refCountry ?? '').trim().toLowerCase()
  let score = 0
  if (ci && ri && ci === ri) score += 55
  if (ch && rc && (ch.includes(rc) || rc.includes(ch))) score += 25
  if (score === 0 && (ci || ri || ch || rc)) score = 20
  return Math.min(100, score)
}

export function CompanyDetailProofPointsTab({
  company,
  references,
}: {
  company: CompanyDetailCompany
  references: CompanyRefRow[]
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referenz-Bibliothek</CardTitle>
          <CardDescription>{references.length} Referenzen (direkt dem Account zugeordnet)</CardDescription>
        </CardHeader>
        <CardContent>
          {references.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Referenzen verknüpft.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Readiness</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Projektstatus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {references.map((r) => {
                  const score = matchScore({
                    companyIndustry: company.industry,
                    companyHq: company.headquarters,
                    refIndustry: (r as unknown as { industry?: string | null }).industry ?? null,
                    refCountry: (r as unknown as { country?: string | null }).country ?? null,
                  })
                  const readiness = referenceStatusLabel(r.status)
                  const readinessVariant =
                    r.status === 'approved'
                      ? ('secondary' as const)
                      : r.status === 'internal_only'
                        ? ('outline' as const)
                        : ('outline' as const)
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link className="hover:underline" href={ROUTES.evidence.detail(r.id)}>
                          {r.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={readinessVariant}>{readiness}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{score}</TableCell>
                      <TableCell className="text-muted-foreground">{r.project_status ?? '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

