"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

type ReferenceHelpfulChoice = "__none__" | "yes" | "no" | "na"

export function OutcomeDialog({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<"won" | "lost" | "withdrawn" | "">("")
  const [comment, setComment] = useState("")
  const [referenceHelpful, setReferenceHelpful] = useState<ReferenceHelpfulChoice>("__none__")
  const [saving, setSaving] = useState(false)

  /** `undefined` = keine Angabe (Feld weglassen im Event-Payload). */
  function mapReferenceHelpful(): boolean | null | undefined {
    if (referenceHelpful === "yes") return true
    if (referenceHelpful === "no") return false
    if (referenceHelpful === "na") return null
    return undefined
  }

  async function submit() {
    if (!outcome) return
    setSaving(true)
    try {
      const rh = mapReferenceHelpful()
      const res = await recordDealOutcome({
        dealId,
        outcome,
        comment,
        ...(rh !== undefined ? { referenceHelpful: rh } : {}),
      })
      if (!res.success) {
        toast.error(res.error ?? "Konnte Ausgang nicht speichern.")
        return
      }
      toast.success("Ausgang gespeichert.")
      setOpen(false)
      setOutcome("")
      setComment("")
      setReferenceHelpful("__none__")
      router.refresh()
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ausgang des Deals</DialogTitle>
          <DialogDescription>Kurz festhalten, wie der Deal ausgegangen ist.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Outcome</Label>
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
            <Label htmlFor="outcome-comment">Grund (Freitext, optional)</Label>
            <Textarea
              id="outcome-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="z. B. Kriterien, Wettbewerber, Lessons Learned …"
            />
          </div>
          <div className="space-y-2">
            <Label>War die Referenz hilfreich?</Label>
            <Select
              value={referenceHelpful}
              onValueChange={(v) => setReferenceHelpful(v as ReferenceHelpfulChoice)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Keine Angabe</SelectItem>
                <SelectItem value="yes">Ja</SelectItem>
                <SelectItem value="no">Nein</SelectItem>
                <SelectItem value="na">Nicht zutreffend</SelectItem>
              </SelectContent>
            </Select>
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

