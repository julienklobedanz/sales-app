'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import {
  LOT_PRIORITY_SELECT_VALUES,
  lotPrioritySelectFromDb,
  type LotPrioritySelectValue,
} from '@/lib/tenders/lot-award-limits'
import {
  TENDER_PROCEDURE_TYPE_LABELS,
  TENDER_PROCEDURE_TYPES,
} from '@/lib/tenders/procedure-types'

import { updateTenderStammdatenAction } from '@/app/(app)/deals/tender-actions'

const PROCEDURE_NONE = '__none__'

const PRIORITY_LABELS: Record<LotPrioritySelectValue, string> = {
  unknown: COPY.tenders.unknown,
  yes: COPY.tenders.yes,
  no: COPY.tenders.no,
}

export type EditTenderDialogTender = {
  id: string
  title: string
  procedure_type: string | null
  reference_number: string | null
  total_volume: string | null
  max_lots_bid: number | null
  max_lots_award: number | null
  lot_priority_required: boolean | null
}

export function EditTenderDialog({ tender }: { tender: EditTenderDialogTender }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(tender.title)
  const [procedureType, setProcedureType] = useState(tender.procedure_type ?? '')
  const [referenceNumber, setReferenceNumber] = useState(tender.reference_number ?? '')
  const [totalVolume, setTotalVolume] = useState(tender.total_volume ?? '')
  const [maxLotsBid, setMaxLotsBid] = useState(tender.max_lots_bid?.toString() ?? '')
  const [maxLotsAward, setMaxLotsAward] = useState(
    tender.max_lots_award?.toString() ?? '',
  )
  const [lotPriority, setLotPriority] = useState<LotPrioritySelectValue>(
    lotPrioritySelectFromDb(tender.lot_priority_required),
  )

  function syncFromTender() {
    setTitle(tender.title)
    setProcedureType(tender.procedure_type ?? '')
    setReferenceNumber(tender.reference_number ?? '')
    setTotalVolume(tender.total_volume ?? '')
    setMaxLotsBid(tender.max_lots_bid?.toString() ?? '')
    setMaxLotsAward(tender.max_lots_award?.toString() ?? '')
    setLotPriority(lotPrioritySelectFromDb(tender.lot_priority_required))
  }

  function handleOpenChange(next: boolean) {
    if (next) syncFromTender()
    setOpen(next)
  }

  async function submit() {
    setSaving(true)
    try {
      const res = await updateTenderStammdatenAction({
        tenderId: tender.id,
        title,
        procedureType: procedureType || null,
        referenceNumber,
        totalVolume,
        maxLotsBid,
        maxLotsAward,
        lotPriorityRequired: lotPriority,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Konnte Stammdaten nicht speichern.')
        return
      }
      toast.success(COPY.tenders.saveSuccess)
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <AppIcon icon={Pencil} size={16} className="mr-2" />
          {COPY.tenders.edit}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.tenders.editDialogTitle}</DialogTitle>
          <DialogDescription>{COPY.tenders.editDialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tender-title">{COPY.tenders.titleField}</Label>
            <Input
              id="tender-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tender-procedure">{COPY.tenders.procedureType}</Label>
            <Select
              value={procedureType || PROCEDURE_NONE}
              onValueChange={(value) =>
                setProcedureType(value === PROCEDURE_NONE ? '' : value)
              }
              disabled={saving}
            >
              <SelectTrigger id="tender-procedure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROCEDURE_NONE}>{COPY.tenders.unknown}</SelectItem>
                {TENDER_PROCEDURE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TENDER_PROCEDURE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tender-reference">{COPY.tenders.referenceNumber}</Label>
            <Input
              id="tender-reference"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tender-volume">{COPY.tenders.totalVolume}</Label>
            <Input
              id="tender-volume"
              value={totalVolume}
              onChange={(event) => setTotalVolume(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tender-max-bid">{COPY.tenders.maxLotsBid}</Label>
              <Input
                id="tender-max-bid"
                type="number"
                min={1}
                inputMode="numeric"
                value={maxLotsBid}
                onChange={(event) => setMaxLotsBid(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tender-max-award">{COPY.tenders.maxLotsAward}</Label>
              <Input
                id="tender-max-award"
                type="number"
                min={1}
                inputMode="numeric"
                value={maxLotsAward}
                onChange={(event) => setMaxLotsAward(event.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tender-priority">{COPY.tenders.lotPriorityRequired}</Label>
            <Select
              value={lotPriority}
              onValueChange={(value) => setLotPriority(value as LotPrioritySelectValue)}
              disabled={saving}
            >
              <SelectTrigger id="tender-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOT_PRIORITY_SELECT_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {COPY.tenders.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !title.trim()}>
            {saving ? COPY.tenders.saving : COPY.tenders.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
