'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { setTenderLotPrioritiesAction } from '@/app/(app)/deals/tender-actions'
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { formatDealVolume } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { orderLotsForPriorityList } from '@/lib/tenders/lot-priority-gap'

export type TenderLotPriorityListItem = {
  id: string
  title: string
  volume: string | null
  lot_priority: number | null
}

function moveLot(
  lots: TenderLotPriorityListItem[],
  index: number,
  direction: -1 | 1,
): TenderLotPriorityListItem[] {
  const target = index + direction
  if (target < 0 || target >= lots.length) return lots
  const next = [...lots]
  const current = next[index]
  const swapped = next[target]
  if (!current || !swapped) return lots
  next[index] = swapped
  next[target] = current
  return next
}

export function TenderLotPriorityList({
  tenderId,
  lots,
  canManage,
}: {
  tenderId: string
  lots: TenderLotPriorityListItem[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [ordered, setOrdered] = useState(() => orderLotsForPriorityList(lots))

  useEffect(() => {
    setOrdered(orderLotsForPriorityList(lots))
  }, [lots])

  function persist(next: TenderLotPriorityListItem[]) {
    const previous = ordered
    const ranked = next.map((lot, index) => ({ ...lot, lot_priority: index + 1 }))
    setOrdered(ranked)
    startTransition(async () => {
      const res = await setTenderLotPrioritiesAction({
        tenderId,
        orderedDealIds: ranked.map((lot) => lot.id),
      })
      if (!res.success) {
        setOrdered(previous)
        toast.error(res.error ?? COPY.tenders.priorityOrderFailed)
        return
      }
      router.refresh()
    })
  }

  return (
    <ul className="mt-3 divide-y">
      {ordered.map((lot, index) => (
        <li key={lot.id} className="flex items-center gap-2 py-2">
          <span className="w-6 shrink-0 tabular-nums text-sm text-muted-foreground">
            {lot.lot_priority ?? '—'}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{lot.title}</span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {formatDealVolume(lot.volume)}
          </span>
          {canManage ? (
            <div className="flex shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={pending || index === 0}
                aria-label={COPY.tenders.moveLotUp}
                onClick={() => persist(moveLot(ordered, index, -1))}
              >
                <AppIcon icon={ArrowUp} size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={pending || index === ordered.length - 1}
                aria-label={COPY.tenders.moveLotDown}
                onClick={() => persist(moveLot(ordered, index, 1))}
              >
                <AppIcon icon={ArrowDown} size={14} />
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
