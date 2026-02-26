'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { DEAL_STATUS_LABELS, type DealRow } from './types'
import type { DealWithReferences } from './types'
import type { RefOption } from './deal-detail-content'
import { DealDetailContent } from './deal-detail-content'
import { getDealWithReferences } from './actions'
import { HandshakeIcon, TimerIcon, PlusCircleIcon, Loader2 } from 'lucide-react'

const REFERENCE_DAYS = 180

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${day}.${month}.${year}`
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

type Props = { deals: DealRow[]; expiring: DealRow[]; allReferences: RefOption[]; initialOpenDealId?: string | null }

export function DealsClientContent({ deals, expiring, allReferences, initialOpenDealId }: Props) {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialOpenDealId ?? null)
  const [selectedDeal, setSelectedDeal] = useState<DealWithReferences | null>(null)
  const [loadingDeal, setLoadingDeal] = useState(false)

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <HandshakeIcon className="size-5 text-muted-foreground" />
              <CardTitle>Aktuelle Deals</CardTitle>
            </div>
            <CardDescription>
              Übersicht der laufenden Deals und eingestellten Bedarfe.
            </CardDescription>
          </div>
          <Link href="/dashboard/deals/new">
            <Button size="sm">
              <PlusCircleIcon className="mr-2 size-4" />
              Deal anlegen
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
              <p className="text-sm">Noch keine Deals angelegt.</p>
              <Link href="/dashboard/deals/new">
                <Button variant="outline" size="sm" className="mt-3">
                  Deal anlegen
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Status</TableHead>
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TimerIcon className="size-5 text-muted-foreground" />
            <CardTitle>Auslaufende Deals</CardTitle>
          </div>
          <CardDescription>
            Deals mit Ablaufdatum in den nächsten 180 Tagen – rechtzeitig informiert bleiben.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiring.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
              <p className="text-sm">Keine auslaufenden Deals.</p>
              <p className="mt-1 text-xs">Deals mit Ablaufdatum erscheinen hier.</p>
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
                    </div>
                    <ExpiryBadge dateStr={deal.expiry_date!} />
                  </div>
                  <ProgressBar dateStr={deal.expiry_date!} />
                  <div className="flex items-center justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => openDealSheet(deal.id)}>
                      Öffnen
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pt-0">
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
    </div>
  )
}
