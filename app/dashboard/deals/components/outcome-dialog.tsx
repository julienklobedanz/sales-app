"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trophy } from "@hugeicons/core-free-icons"

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
import { Textarea } from "@/components/ui/textarea"

import { recordDealOutcome } from "../actions"

export function OutcomeDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<"won" | "lost" | "withdrawn" | "">("")
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!outcome) return
    setSaving(true)
    try {
      const res = await recordDealOutcome({ dealId, outcome, comment })
      if (!res.success) {
        toast.error(res.error ?? "Konnte Ausgang nicht speichern.")
        return
      }
      toast.success("Ausgang gespeichert.")
      setOpen(false)
      setOutcome("")
      setComment("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full">
          <AppIcon icon={Trophy} size={16} className="mr-2" />
          Ausgang festhalten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ausgang des Deals</DialogTitle>
          <DialogDescription>Kurz festhalten, wie der Deal ausgegangen ist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Ausgang</Label>
            <Select
              value={outcome || "__none__"}
              onValueChange={(v) => setOutcome(v === "__none__" ? "" : (v as "won" | "lost" | "withdrawn"))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="won">Gewonnen</SelectItem>
                <SelectItem value="lost">Verloren</SelectItem>
                <SelectItem value="withdrawn">Zurückgezogen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="outcome-comment">Kommentar (optional)</Label>
            <Textarea
              id="outcome-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !outcome}>
            {saving ? "Speichern …" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

