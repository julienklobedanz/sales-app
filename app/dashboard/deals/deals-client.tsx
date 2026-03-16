'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DEAL_STATUS_LABELS, type DealRow } from './types'
import type { DealWithReferences } from './types'
import type { RefOption } from './deal-detail-content'
import { DealDetailContent } from './deal-detail-content'
import { getDealWithReferences, importDealsFromXlsx, type MatchSuggestion } from './actions'
import { HandshakeIcon, TimerIcon, PlusCircleIcon, Loader2, FileSpreadsheetIcon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'

type MatchMap = Record<string, { count: number; suggestions: MatchSuggestion[] }>

const REFERENCE_DAYS = 180

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
}

/** Volumen mit Tausender-Punkten (z. B. 1.500.000 oder 5 Mio). */
function formatVolume(vol: string | null): string {
  if (!vol || !vol.trim()) return '—'
  const normalized = vol.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  if (!Number.isNaN(num)) {
    if (num >= 1_000_000) return new Intl.NumberFormat('de-DE').format(Math.round(num / 1_000_000)) + ' Mio €'
    return new Intl.NumberFormat('de-DE').format(Math.round(num)) + ' €'
  }
  return vol
}

function LinkedRefLogos({ refs }: { refs: { id: string; logo_url?: string | null; title?: string }[] }) {
  const show = refs.slice(0, 3)
  const rest = refs.length - show.length
  return (
    <div className="flex items-center gap-0.5">
      {show.map((r) =>
        r.logo_url ? (
          <img
            key={r.id}
            src={r.logo_url}
            alt=""
            className="h-6 w-6 rounded object-contain border border-border bg-background"
            title={r.title}
          />
        ) : (
          <div
            key={r.id}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted text-[10px] text-muted-foreground"
            title={r.title}
          >
            —
          </div>
        )
      )}
      {rest > 0 && <span className="text-muted-foreground text-xs">+{rest}</span>}
    </div>
  )
}

function SmartMatchCell({
  dealId,
  matchMap,
  onOpenDeal,
}: { dealId: string; matchMap: MatchMap; onOpenDeal: (id: string) => void }) {
  const data = matchMap[dealId] ?? { count: 0, suggestions: [] }
  if (data.count === 0 && data.suggestions.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-primary hover:underline text-sm font-medium"
        >
          {data.count} passende Referenz{data.count !== 1 ? 'en' : ''}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-muted-foreground text-xs mb-2">Top-Vorschläge (Branche)</p>
        <ul className="space-y-1.5">
          {data.suggestions.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              {s.logo_url && (
                <img src={s.logo_url} alt="" className="h-6 w-6 rounded object-contain shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{s.title}</p>
                <p className="text-muted-foreground text-xs truncate">{s.company_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenDeal(dealId)}>Öffnen</Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  if (days <= 0) return <Badge variant="destructive">Abgelaufen</Badge>
  if (days <= 30) return <Badge variant="destructive">Läuft in {days} Tagen ab</Badge>
  if (days <= 90) return <Badge className="bg-yellow-500/90 text-white hover:bg-yellow-500/90">In {days} Tagen</Badge>
  return <Badge variant="secondary">Noch {days} Tage</Badge>
}

function ProgressBar({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  const total = REFERENCE_DAYS
  const remaining = Math.min(Math.max(days, 0), total)
  const percent = Math.round((remaining / total) * 100)
  const isRed = days <= 30
  const isYellow = days <= 90 && days > 30
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full transition-all ${
          isRed ? 'bg-destructive' : isYellow ? 'bg-yellow-500' : 'bg-primary'
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

type Props = {
  deals: DealRow[]
  expiring: DealRow[]
  allReferences: RefOption[]
  matchMap: MatchMap
  initialOpenDealId?: string | null
  companies: { id: string; name: string }[]
  orgProfiles: { id: string; full_name: string | null }[]
}

export function DealsClientContent({ deals, expiring, allReferences, matchMap, initialOpenDealId, companies, orgProfiles }: Props) {
  const router = useRouter()
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialOpenDealId ?? null)
  const [selectedDeal, setSelectedDeal] = useState<DealWithReferences | null>(null)
  const [loadingDeal, setLoadingDeal] = useState(false)
  const [importing, setImporting] = useState(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (initialOpenDealId) setSelectedDealId(initialOpenDealId)
  }, [initialOpenDealId])

  useEffect(() => {
    if (!selectedDealId) {
      setSelectedDeal(null)
      return
    }
    setLoadingDeal(true)
    getDealWithReferences(selectedDealId)
      .then((data) => {
        setSelectedDeal(data ?? null)
      })
      .finally(() => setLoadingDeal(false))
  }, [selectedDealId])

  const openDealSheet = (id: string) => setSelectedDealId(id)
  const closeDealSheet = () => setSelectedDealId(null)

  async function handleXlsxImport(file: File) {
    const formData = new FormData()
    formData.set('file', file)
    setImporting(true)
    try {
      const result = await importDealsFromXlsx(formData)
      if (result.success) {
        toast.success(result.created != null ? `${result.created} Deal(s) importiert.` : 'Import abgeschlossen.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Import fehlgeschlagen.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="grid min-h-[70vh] gap-6 lg:grid-cols-2">
      <Card className="flex min-h-[520px] flex-1 flex-col">
        <CardHeader className="flex min-h-[5.5rem] flex-row items-start justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <HandshakeIcon className="size-5 text-muted-foreground" />
              <CardTitle>Referenz-Bedarfe (Sales Requests)</CardTitle>
            </div>
            <CardDescription>
              Hier melden Salesleute, für welche laufenden Deals sie Referenzen benötigen.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusCircleIcon className="mr-2 size-4" />
            Deal anlegen
          </Button>
        </CardHeader>
        <CardContent className="flex-1">
          {deals.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
              <p className="text-sm">Noch keine Referenz-Bedarfe angelegt.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Volumen (€)</TableHead>
                  <TableHead>Verknüpfte Referenzen</TableHead>
                  <TableHead>Smart Match</TableHead>
                  <TableHead className="text-right">Ablauf</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{deal.company_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{DEAL_STATUS_LABELS[deal.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatVolume(deal.volume)}
                    </TableCell>
                    <TableCell>
                      {deal.linked_refs?.length ? (
                        <LinkedRefLogos refs={deal.linked_refs} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SmartMatchCell dealId={deal.id} matchMap={matchMap} onOpenDeal={openDealSheet} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {deal.expiry_date ? formatDate(deal.expiry_date) : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDealSheet(deal.id)}>
                        Öffnen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-[520px] flex-1 flex-col">
        <CardHeader className="flex min-h-[5.5rem] flex-col gap-3 space-y-0">
          <div className="flex flex-row items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TimerIcon className="size-5 text-muted-foreground" />
                <CardTitle>Expiring Deals (Marktchancen)</CardTitle>
              </div>
              <CardDescription>
                Listen von Verträgen, die bei Wettbewerbern auslaufen (z. B. Gartner/ISG). xlsx-Import oben rechts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              ref={xlsxInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleXlsxImport(file)
                e.target.value = ''
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => !importing && xlsxInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && !importing && xlsxInputRef.current?.click()}
              className="flex h-9 items-center rounded-md border px-3 text-xs text-muted-foreground cursor-pointer hover:bg-muted/50"
            >
              <span className="truncate">xlsx Import</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={importing}
              onClick={() => xlsxInputRef.current?.click()}
            >
              {importing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UploadIcon className="mr-2 size-4" />}
              Listen importieren
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <PlusCircleIcon className="mr-2 size-4" />
              Deal anlegen
            </Button>
          </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {expiring.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
              <p className="text-sm">Keine auslaufenden Deals.</p>
              <p className="mt-1 text-xs">xlsx-Datei oben ablegen oder „Listen importieren“ nutzen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expiring.map((deal) => (
                <div
                  key={deal.id}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openDealSheet(deal.id)}
                        className="font-medium hover:underline text-left"
                      >
                        {deal.title}
                      </button>
                      {deal.company_name && (
                        <p className="text-muted-foreground text-sm">{deal.company_name}</p>
                      )}
                      {deal.incumbent_provider && (
                        <p className="text-muted-foreground text-xs mt-0.5">
                          <strong>Aktueller Anbieter:</strong> {deal.incumbent_provider}
                        </p>
                      )}
                    </div>
                    <ExpiryBadge dateStr={deal.expiry_date!} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Volumen: {formatVolume(deal.volume)}
                    </span>
                    {deal.linked_refs?.length ? (
                      <span className="flex items-center gap-1.5">
                        Referenzen: <LinkedRefLogos refs={deal.linked_refs} />
                      </span>
                    ) : null}
                    <SmartMatchCell dealId={deal.id} matchMap={matchMap} onOpenDeal={openDealSheet} />
                  </div>
                  <ProgressBar dateStr={deal.expiry_date!} />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openDealSheet(deal.id)}>
                      Öffnen
                    </Button>
                  </div>
                  {deal.account_manager_id && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {(deal.account_manager_name ?? deal.account_manager_id).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>AM: {deal.account_manager_name ?? '—'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedDealId} onOpenChange={(open) => !open && closeDealSheet()}>
        <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-sm md:w-[380px] md:max-w-[380px] overflow-y-auto">
          <SheetHeader className="shrink-0 border-b px-4 py-4">
            <SheetTitle>
              {selectedDeal ? selectedDeal.title : 'Deal'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loadingDeal && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingDeal && selectedDeal && (
              <DealDetailContent deal={selectedDeal} allReferences={allReferences} />
            )}
          </div>
        </SheetContent>
      </Sheet>
      {/* Modal zum Anlegen eines neuen Deals */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader className="mb-4">
            <SheetTitle>Deal anlegen</SheetTitle>
          </SheetHeader>
          <DealForm companies={companies} orgProfiles={orgProfiles} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
