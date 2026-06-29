'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { DealCoverageMatrix, extractCoveredReferences } from '@/components/deals/deal-coverage-matrix'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AppIcon } from '@/lib/icons'
import { DatabaseSyncIcon, Wifi01Icon } from '@hugeicons/core-free-icons'
import type { RfpCoverageRow } from '@/lib/rfp-coverage-types'
import { buildCrmDealUrl, dealHasCrmSync } from '@/lib/crm/deal-links'
import { formatDealVolume } from '@/lib/format'
import { ROUTES } from '@/lib/routes'

import type { AccountDealRow, StakeholderRow } from './actions'
import { ChampionKitDialog } from './champion-kit-dialog'
import {
  addDealRequirementAction,
  fetchDealProofCoverageAction,
  importDealRequirementsFromRfpAction,
  importDealRequirementsFromTextAction,
  listDealRequirementsAction,
  removeDealRequirementAction,
  type DealRequirementRow,
} from './deal-requirements-actions'

export function CompanyDetailDealsProofTab({
  activeDeals,
  hubspotPortalId = null,
  stakeholders,
  isActive,
}: {
  activeDeals: AccountDealRow[]
  hubspotPortalId?: string | null
  stakeholders: StakeholderRow[]
  isActive: boolean
}) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(
    activeDeals[0]?.id ?? null
  )
  const [requirements, setRequirements] = useState<DealRequirementRow[]>([])
  const [coverage, setCoverage] = useState<RfpCoverageRow[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [loadingCoverage, setLoadingCoverage] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState<'text' | 'rfp' | null>(null)
  const [championKitOpen, setChampionKitOpen] = useState(false)

  const championName =
    stakeholders.find((s) => s.role === 'champion')?.name?.trim() || null
  const coveredReferences = extractCoveredReferences(coverage)

  useEffect(() => {
    if (!activeDeals.some((d) => d.id === selectedDealId)) {
      setSelectedDealId(activeDeals[0]?.id ?? null)
    }
  }, [activeDeals, selectedDealId])

  const loadRequirements = useCallback(async (dealId: string) => {
    setLoadingReqs(true)
    try {
      const res = await listDealRequirementsAction(dealId)
      if (!res.success) {
        toast.error(res.error)
        setRequirements([])
        return
      }
      setRequirements(res.rows)
    } finally {
      setLoadingReqs(false)
    }
  }, [])

  const loadCoverage = useCallback(async (dealId: string) => {
    setLoadingCoverage(true)
    try {
      const res = await fetchDealProofCoverageAction(dealId)
      if (!res.success) {
        toast.error(res.error)
        setCoverage([])
        return
      }
      setCoverage(res.coverage)
    } finally {
      setLoadingCoverage(false)
    }
  }, [])

  useEffect(() => {
    if (!isActive || !selectedDealId) {
      setRequirements([])
      setCoverage([])
      return
    }
    void loadRequirements(selectedDealId)
  }, [isActive, selectedDealId, loadRequirements])

  useEffect(() => {
    if (!isActive || !selectedDealId || requirements.length === 0) {
      setCoverage([])
      return
    }
    void loadCoverage(selectedDealId)
  }, [isActive, selectedDealId, requirements, loadCoverage])

  const selectedDeal = activeDeals.find((d) => d.id === selectedDealId) ?? null
  const hasCrm = activeDeals.some((d) => dealHasCrmSync(d))
  const hasLocal = activeDeals.some((d) => !dealHasCrmSync(d))
  const pipelineSource: 'live' | 'local' | 'mixed' =
    hasCrm && hasLocal ? 'mixed' : hasCrm ? 'live' : 'local'

  const handleAdd = async () => {
    if (!selectedDealId || !newLabel.trim()) return
    setAdding(true)
    try {
      const res = await addDealRequirementAction(selectedDealId, newLabel)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setNewLabel('')
      setRequirements((prev) => [...prev, res.row])
      toast.success('Kriterium hinzugefügt.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    const res = await removeDealRequirementAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setRequirements((prev) => prev.filter((r) => r.id !== id))
    toast.success('Kriterium entfernt.')
  }

  const handleImportText = async () => {
    if (!selectedDealId) return
    setImporting('text')
    try {
      const res = await importDealRequirementsFromTextAction(selectedDealId)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(
        res.imported > 0
          ? `${res.imported} Kriterien aus Deal-Text importiert.`
          : 'Keine neuen Kriterien (bereits vorhanden).'
      )
      await loadRequirements(selectedDealId)
    } finally {
      setImporting(null)
    }
  }

  const handleImportRfp = async () => {
    if (!selectedDealId) return
    setImporting('rfp')
    try {
      const res = await importDealRequirementsFromRfpAction(selectedDealId)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(
        res.imported > 0
          ? `${res.imported} Kriterien aus RFP-Analyse importiert.`
          : 'Keine neuen Kriterien (bereits vorhanden).'
      )
      await loadRequirements(selectedDealId)
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>
              {activeDeals.length} Deals · Quelle:{' '}
              <span className="inline-flex items-center gap-1">
                <AppIcon
                  icon={pipelineSource === 'live' ? Wifi01Icon : DatabaseSyncIcon}
                  size={14}
                  className="text-muted-foreground"
                />
                {pipelineSource === 'live'
                  ? 'CRM (Live)'
                  : pipelineSource === 'mixed'
                    ? 'CRM + Lokal'
                    : 'RefStack (Lokal)'}
              </span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {activeDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine aktiven Deals.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Volumen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ablauf</TableHead>
                  <TableHead>Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDeals.map((d) => {
                  const isSelected = d.id === selectedDealId
                  return (
                    <TableRow
                      key={d.id}
                      className={isSelected ? 'bg-muted/50' : 'cursor-pointer'}
                      onClick={() => setSelectedDealId(d.id)}
                    >
                      <TableCell className="font-medium">
                        <Link
                          className="hover:underline"
                          href={ROUTES.deals.detail(d.id)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {d.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDealVolume(d.volume)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.expiry_date ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(() => {
                          const crmLink = buildCrmDealUrl(d, { hubspotPortalId })
                          if (crmLink && crmLink.href !== '#') {
                            return (
                              <a
                                href={crmLink.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-2 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {crmLink.label}
                              </a>
                            )
                          }
                          if (crmLink) return crmLink.label
                          return 'Lokal'
                        })()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedDeal ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof-Coverage</CardTitle>
            <CardDescription>
              Entscheidungskriterien für{' '}
              <span className="font-medium text-foreground">{selectedDeal.title}</span> gegen die
              Referenzbibliothek abgleichen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="deal-req-input">Kriterium</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="deal-req-input"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="z. B. ISO 27001 / Security"
                  className="max-w-md"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAdd()
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={adding || !newLabel.trim()}
                  onClick={() => void handleAdd()}
                >
                  {adding ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Hinzufügen
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={importing !== null}
                  onClick={() => void handleImportText()}
                >
                  {importing === 'text' ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Aus Deal-Text importieren
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={importing !== null}
                  onClick={() => void handleImportRfp()}
                >
                  {importing === 'rfp' ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Aus RFP-Analyse importieren
                </Button>
              </div>
            </div>

            {loadingReqs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Kriterien laden …
              </div>
            ) : requirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Kriterien — manuell hinzufügen oder aus Deal-Text/RFP importieren.
              </p>
            ) : (
              <ul className="space-y-2">
                {requirements.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-start justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span>{req.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => void handleRemove(req.id)}
                      aria-label="Kriterium entfernen"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {requirements.length > 0 ? (
              loadingCoverage ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Coverage berechnen …
                </div>
              ) : (
                <div className="space-y-4">
                  {coveredReferences.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        {coveredReferences.length} belegte Referenz
                        {coveredReferences.length === 1 ? '' : 'en'} für Champion-Kit verfügbar.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setChampionKitOpen(true)}
                      >
                        <Package className="mr-2 size-4" />
                        Champion-Kit
                      </Button>
                    </div>
                  ) : null}
                  <DealCoverageMatrix coverage={coverage} dealId={selectedDealId ?? undefined} />
                </div>
              )
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {selectedDeal ? (
        <ChampionKitDialog
          open={championKitOpen}
          onOpenChange={setChampionKitOpen}
          dealTitle={selectedDeal.title}
          championName={championName}
          coveredReferences={coveredReferences}
        />
      ) : null}
    </div>
  )
}
