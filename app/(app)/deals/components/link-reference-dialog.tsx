'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CirclePlus } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { addReferenceToDeal, getReferencesForOrg } from '../actions'

export function LinkReferenceDialog({
  dealId,
  linkedRefIds,
  availableRefs: availableRefsProp,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: {
  dealId: string
  linkedRefIds?: string[]
  /** @deprecated Lazy-Load bevorzugt — nur für Legacy-Aufrufer */
  availableRefs?: Array<{ id: string; title: string; company_name: string }>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [refId, setRefId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadedRefs, setLoadedRefs] = useState<Array<{
    id: string
    title: string
    company_name: string
  }> | null>(availableRefsProp ?? null)
  const [loadingRefs, setLoadingRefs] = useState(false)

  const linkedSet = useMemo(() => new Set(linkedRefIds ?? []), [linkedRefIds])

  useEffect(() => {
    if (!open || availableRefsProp) return
    let cancelled = false
    setLoadingRefs(true)
    void getReferencesForOrg()
      .then((refs) => {
        if (!cancelled) setLoadedRefs(refs)
      })
      .finally(() => {
        if (!cancelled) setLoadingRefs(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, availableRefsProp])

  const availableRefs = useMemo(() => {
    const source = availableRefsProp ?? loadedRefs ?? []
    return source.filter((r) => !linkedSet.has(r.id))
  }, [availableRefsProp, loadedRefs, linkedSet])

  const disabled = useMemo(
    () => !loadingRefs && availableRefs.length === 0,
    [availableRefs.length, loadingRefs],
  )

  async function submit() {
    if (!refId) return
    setSaving(true)
    try {
      const res = await addReferenceToDeal(dealId, refId)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Referenz verknüpft.')
        setOpen(false)
        setRefId('')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={disabled}
          >
            <AppIcon icon={CirclePlus} size={16} className="mr-2" />
            Referenz verknüpfen
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Referenz verknüpfen</DialogTitle>
          <DialogDescription>
            Manuell eine Referenz mit diesem Deal verbinden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Referenz</Label>
          {loadingRefs ? (
            <p className="text-sm text-muted-foreground">Referenzen werden geladen …</p>
          ) : (
            <Select
              value={refId || '__none__'}
              onValueChange={(v) => setRefId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {availableRefs.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} ({r.company_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !refId || loadingRefs}>
            {saving ? 'Verknüpfen …' : 'Verknüpfen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
