'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RFP_COVER_THRESHOLD, type RfpCoverageRow } from '@/lib/rfp-coverage-types'
import { ROUTES } from '@/lib/routes'

export function computeCoverageStats(coverage: RfpCoverageRow[]) {
  if (!coverage.length) {
    return { coveredCount: 0, totalReq: 0, coveragePct: 0 }
  }
  const total = coverage.length
  const covered = coverage.filter((row) => {
    if (row.embedError) return false
    const best = row.matches[0]
    return best && best.similarity >= RFP_COVER_THRESHOLD
  }).length
  return {
    coveredCount: covered,
    totalReq: total,
    coveragePct: total ? Math.round((covered / total) * 100) : 0,
  }
}

export function extractCoveredReferenceIds(coverage: RfpCoverageRow[]): string[] {
  const ids = new Set<string>()
  for (const row of coverage) {
    if (row.embedError) continue
    const best = row.matches[0]
    if (best && best.similarity >= RFP_COVER_THRESHOLD) {
      ids.add(best.id)
    }
  }
  return Array.from(ids)
}

export function extractCoveredReferences(coverage: RfpCoverageRow[]) {
  const byId = new Map<string, { id: string; title: string; companyName: string | null }>()
  for (const row of coverage) {
    if (row.embedError) continue
    const best = row.matches[0]
    if (!best || best.similarity < RFP_COVER_THRESHOLD) continue
    if (!byId.has(best.id)) {
      byId.set(best.id, {
        id: best.id,
        title: best.title,
        companyName: best.companyName ?? null,
      })
    }
  }
  return Array.from(byId.values())
}

export function DealCoverageMatrix({
  coverage,
  dealId,
  showProgress = true,
  linkedRefIds,
  linkingId,
  onLinkBestMatch,
}: {
  coverage: RfpCoverageRow[]
  dealId?: string
  showProgress?: boolean
  linkedRefIds?: Set<string>
  linkingId?: string | null
  onLinkBestMatch?: (referenceId: string, similarity: number) => void
}) {
  const { coveredCount, totalReq, coveragePct } = computeCoverageStats(coverage)
  if (totalReq === 0) return null

  return (
    <div className="space-y-3">
      {showProgress ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Proof-Abdeckung</span>
            <span className="font-medium tabular-nums">
              {coveredCount}/{totalReq} Anforderungen ({coveragePct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/20 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Anforderung</TableHead>
              <TableHead className="min-w-[160px]">Bester Beweis</TableHead>
              <TableHead className="w-[110px]">Score</TableHead>
              <TableHead className="w-[150px]">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.map((row) => {
              const best = row.matches[0]
              const isGap =
                Boolean(row.embedError) || !best || best.similarity < RFP_COVER_THRESHOLD
              return (
                <TableRow
                  key={row.requirementId}
                  className={isGap ? 'bg-amber-50/80 dark:bg-amber-950/25' : undefined}
                >
                  <TableCell className="align-top text-sm">
                    {isGap ? (
                      <span className="mr-1 inline-flex text-amber-600" aria-hidden>
                        ⚠
                      </span>
                    ) : (
                      <span className="mr-1 inline-flex text-emerald-600" aria-hidden>
                        ✓
                      </span>
                    )}
                    {row.requirementText}
                    {row.embedError ? (
                      <span className="mt-1 block text-xs text-destructive">{row.embedError}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {best ? (
                      <div>
                        <Link
                          href={ROUTES.references.detail(best.id)}
                          className="font-medium hover:underline"
                        >
                          {best.title}
                        </Link>
                        {best.companyName ? (
                          <div className="text-xs text-muted-foreground">{best.companyName}</div>
                        ) : null}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="align-top font-mono text-sm tabular-nums">
                    {best ? `${Math.round(best.similarity * 100)} %` : '—'}
                  </TableCell>
                  <TableCell className="align-top">
                    {isGap && dealId ? (
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link href={`${ROUTES.request}?dealId=${encodeURIComponent(dealId)}`}>
                          Referenz anfragen
                        </Link>
                      </Button>
                    ) : best && onLinkBestMatch ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={
                          linkingId === best.id || Boolean(linkedRefIds?.has(best.id))
                        }
                        onClick={() => onLinkBestMatch(best.id, best.similarity)}
                      >
                        {linkingId === best.id
                          ? '…'
                          : linkedRefIds?.has(best.id)
                            ? 'Bereits im Deal'
                            : 'In Deal übernehmen'}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
