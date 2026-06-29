"use client"

import { useEffect, useState } from "react"
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
import type { DealStatus } from "../types"

type LinkedReference = {
  id: string
  title: string
  company_name: string
}

export function OutcomeDialog({
  dealId,
  dealStatus,
  linkedReferences,
  initialOutcomeReason = null,
  initialDecisiveReferenceId = null,
}: {
  dealId: string
  dealStatus: DealStatus
  linkedReferences: LinkedReference[]
  initialOutcomeReason?: string | null
  initialDecisiveReferenceId?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<"won" | "lost" | "withdrawn" | "">("")
  const [outcomeReason, setOutcomeReason] = useState("")
  const [decisiveReferenceId, setDecisiveReferenceId] = useState<string>("__none__")
  const [saving, setSaving] = useState(false)

  const isTerminal = dealStatus === "won" || dealStatus === "lost" || dealStatus === "withdrawn"

  useEffect(() => {
    if (!open) return
    setOutcomeReason(initialOutcomeReason ?? "")
    setDecisiveReferenceId(initialDecisiveReferenceId ?? "__none__")
    if (dealStatus === "won" || dealStatus === "lost" || dealStatus === "withdrawn") {
      setOutcome(dealStatus)
    } else {
      setOutcome("")
    }
  }, [open, dealStatus, initialOutcomeReason, initialDecisiveReferenceId])

  async function submit() {
    if (!outcome) return
    setSaving(true)
    try {
      const res = await recordDealOutcome({
        dealId,
        outcome,
        outcomeReason,
        decisiveReferenceId: decisiveReferenceId === "__none__" ? null : decisiveReferenceId,
      })
      if (!res.success) {
        toast.error(res.error ?? "Konnte Ausgang nicht speichern.")
        return
      }
      toast.success("Ausgang gespeichert.")
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const showDecisiveReference =
    (outcome === "won" || outcome === "lost") && linkedReferences.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full">
          <AppIcon icon={Trophy} size={16} className="mr-2" />
          {isTerminal ? "Ausgang bearbeiten" : "Ausgang festhalten"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ausgang des Deals</DialogTitle>
          <DialogDescription>
            Kurz festhalten, wie der Deal ausgegangen ist. Grund und entscheidender Beweis sind optional
            — ein Klick auf Speichern reicht.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Ergebnis</Label>
            <Select
              value={outcome || "__none__"}
              onValueChange={(v) =>
                setOutcome(v === "__none__" ? "" : (v as "won" | "lost" | "withdrawn"))
              }
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
            <Label htmlFor="outcome-reason">
              {outcome === "lost"
                ? "Warum verloren? (optional)"
                : outcome === "won"
                  ? "Warum gewonnen? (optional)"
                  : "Grund (optional)"}
            </Label>
            <Textarea
              id="outcome-reason"
              value={outcomeReason}
              onChange={(e) => setOutcomeReason(e.target.value)}
              rows={3}
              placeholder="z. B. Kriterien, Wettbewerber, Lessons Learned …"
            />
          </div>
          {showDecisiveReference ? (
            <div className="space-y-2">
              <Label>Welcher Beweis war entscheidend? (optional)</Label>
              <Select value={decisiveReferenceId} onValueChange={setDecisiveReferenceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Referenz wählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine Angabe</SelectItem>
                  {linkedReferences.map((ref) => (
                    <SelectItem key={ref.id} value={ref.id}>
                      {ref.title}
                      {ref.company_name ? ` · ${ref.company_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
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
