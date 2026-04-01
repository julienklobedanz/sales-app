"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CirclePlus } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { AppIcon } from "@/lib/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { addReferenceToDeal } from "../actions"

export function LinkReferenceDialog({
  dealId,
  availableRefs,
}: {
  dealId: string
  availableRefs: Array<{ id: string; title: string; company_name: string }>
}) {
  const [open, setOpen] = useState(false)
  const [refId, setRefId] = useState("")
  const [saving, setSaving] = useState(false)

  const disabled = useMemo(() => availableRefs.length === 0, [availableRefs.length])

  async function submit() {
    if (!refId) return
    setSaving(true)
    try {
      const res = await addReferenceToDeal(dealId, refId)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Referenz verknüpft.")
        setOpen(false)
        setRefId("")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full" disabled={disabled}>
          <AppIcon icon={CirclePlus} size={16} className="mr-2" />
          Referenz verknüpfen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Referenz verknüpfen</DialogTitle>
          <DialogDescription>Manuell eine Referenz mit diesem Deal verbinden.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Referenz</Label>
          <Select value={refId || "__none__"} onValueChange={(v) => setRefId(v === "__none__" ? "" : v)}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !refId}>
            {saving ? "Verknüpfen …" : "Verknüpfen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

