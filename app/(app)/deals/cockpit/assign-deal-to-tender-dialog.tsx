'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatTenderLotCount } from '@/lib/tenders/tender-status-label'
import type { OrgTenderOption } from '@/lib/tenders/org-tender-option'

import { assignDealToTenderAction, listTendersForAssignAction } from '../tender-actions'

const CREATE_VALUE = '__create__'

export function AssignDealToTenderDialog({
  dealId,
  dealTitle,
  open,
  onOpenChange,
}: {
  dealId: string
  dealTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [options, setOptions] = useState<OrgTenderOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(CREATE_VALUE)
  const [title, setTitle] = useState(dealTitle)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setTitle(dealTitle)
    void listTendersForAssignAction()
      .then((rows) => {
        if (cancelled) return
        setOptions(rows)
        setSelected(rows.length > 0 ? rows[0]!.id : CREATE_VALUE)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, dealTitle])

  const isCreate = selected === CREATE_VALUE

  async function submit() {
    setSaving(true)
    try {
      const res = await assignDealToTenderAction(
        isCreate
          ? { dealId, mode: 'create', title }
          : { dealId, mode: 'existing', tenderId: selected },
      )
      if (!res.success) {
        toast.error(res.error ?? COPY.deals.cockpit.assignFailed)
        return
      }
      toast.success(COPY.deals.cockpit.assignSuccess)
      onOpenChange(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPY.deals.cockpit.assignDialogTitle}</DialogTitle>
          <DialogDescription>
            {COPY.deals.cockpit.assignDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tender-assign-select">
              {COPY.deals.cockpit.assignExisting}
            </Label>
            <Select
              value={selected}
              onValueChange={setSelected}
              disabled={loading || saving}
            >
              <SelectTrigger id="tender-assign-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CREATE_VALUE}>
                  {COPY.deals.cockpit.assignCreateNew}
                </SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.title}
                    {option.company_name ? ` · ${option.company_name}` : ''}
                    {` · ${formatTenderLotCount(option.lotCount)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCreate ? (
            <div className="space-y-2">
              <Label htmlFor="tender-assign-title">
                {COPY.deals.cockpit.assignTitleLabel}
              </Label>
              <Input
                id="tender-assign-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={saving}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={saving || loading || (isCreate && !title.trim())}
          >
            {saving ? COPY.deals.cockpit.assignPending : COPY.deals.cockpit.assignSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
