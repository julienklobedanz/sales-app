'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ROUTES } from '@/lib/routes'

import type { CompanyRefRow } from './actions'
import { fetchAccountReferenceFitScoresAction } from './account-reference-fit-actions'
import { referenceStatusLabel } from './company-detail-constants'
import type { CompanyDetailCompany } from './company-detail-types'

export function CompanyDetailProofPointsTab({
  company,
  references,
  isActive,
}: {
  company: CompanyDetailCompany
  references: CompanyRefRow[]
  isActive: boolean
}) {
  const [fitScores, setFitScores] = useState<Record<string, number>>({})
  const [loadingFit, setLoadingFit] = useState(false)
  const [fitError, setFitError] = useState<string | null>(null)

  const loadFitScores = useCallback(async () => {
    if (!references.length) {
      setFitScores({})
      return
    }
    setLoadingFit(true)
    setFitError(null)
    try {
      const res = await fetchAccountReferenceFitScoresAction(
        company.id,
        references.map((r) => r.id)
      )
      if (!res.success) {
        setFitError(res.error)
        setFitScores({})
        return
      }
      setFitScores(res.scores)
    } finally {
      setLoadingFit(false)
    }
  }, [company.id, references])

  useEffect(() => {
    if (!isActive) return
    void loadFitScores()
  }, [isActive, loadFitScores])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referenz-Bibliothek</CardTitle>
          <CardDescription>
            {references.length} Referenzen (direkt dem Account zugeordnet). Spalte „Fit“: semantischer
            Match-Score gegen Account-Kontext — für gezielte Suche{' '}
            <Link className="underline underline-offset-2" href={ROUTES.match}>
              Smart Match
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {references.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Referenzen verknüpft.</p>
          ) : (
            <>
              {loadingFit ? (
                <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Fit-Scores berechnen …
                </p>
              ) : null}
              {fitError ? (
                <p className="mb-3 text-sm text-destructive" role="alert">
                  {fitError}
                </p>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Projektstatus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {references.map((r) => {
                    const score = fitScores[r.id]
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
                          <Link className="hover:underline" href={ROUTES.references.detail(r.id)}>
                            {r.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={readinessVariant}>{readiness}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {loadingFit && score === undefined ? '…' : score !== undefined ? score : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.project_status ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
