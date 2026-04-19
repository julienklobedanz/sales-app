"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil } from "@hugeicons/core-free-icons"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { DEAL_STATUS_LABELS, type DealStatus, type DealWithReferences } from "../types"
import { updateDeal } from "../actions"
import { COPY } from "@/lib/copy"

const EDITABLE_DEAL_STATUSES: DealStatus[] = ["open", "rfp", "negotiation", "withdrawn", "archived"]

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function EditDealDialog({
  deal,
  companies,
  orgProfiles,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(deal.title)
  const [companyId, setCompanyId] = useState(deal.company_id ?? "")
  const [industry, setIndustry] = useState(deal.industry ?? "")
  const [volume, setVolume] = useState(deal.volume ?? "")
  const [status, setStatus] = useState<DealStatus>(deal.status)
  const [expiry, setExpiry] = useState(deal.expiry_date ?? "")
  const [isPublic, setIsPublic] = useState(Boolean(deal.is_public))
  const [amId, setAmId] = useState(deal.account_manager_id ?? "")
  const [smId, setSmId] = useState(deal.sales_manager_id ?? "")
  const [requirements, setRequirements] = useState(deal.requirements_text ?? "")

  async function submit() {
    setSaving(true)
    try {
      const res = await updateDeal({
        id: deal.id,
        title,
        company_id: companyId || null,
        industry: industry.trim() || null,
        volume: volume.trim() || null,
        status,
        expiry_date: expiry || null,
        is_public: isPublic,
        account_manager_id: amId || null,
        sales_manager_id: smId || null,
        requirements_text: requirements.trim() || null,
        incumbent_provider: deal.incumbent_provider ?? null,
      })
      if (!res.success) {
        toast.error(res.error ?? "Konnte Deal nicht speichern.")
        return
      }
      toast.success("Deal gespeichert.")
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-full">
          <AppIcon icon={Pencil} size={16} className="mr-2" />
          Bearbeiten
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deal bearbeiten</DialogTitle>
          <DialogDescription>Alle Angaben aus der Deal-Erstellung.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Titel *</Label>
            <Input id="deal-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Unternehmen</Label>
            <Select value={companyId || "__none__"} onValueChange={(v) => setCompanyId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional auswählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Keins —</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-industry">Branche</Label>
              <Input id="deal-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-volume">Volumen</Label>
              <Input id="deal-volume" value={volume} onChange={(e) => setVolume(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              {status === "won" || status === "lost" ? (
                <>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                    {DEAL_STATUS_LABELS[status]}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Abschluss Gewonnen/Verloren läuft über „Ausgang festhalten“ in der Seitenleiste (inkl. Feedback &
                    Ereignis).
                  </p>
                </>
              ) : (
                <>
                  <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITABLE_DEAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DEAL_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Gewonnen/Verloren: Seitenleiste → Ausgang festhalten.
                  </p>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-expiry">Ablaufdatum</Label>
              <Input id="deal-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sichtbarkeit</Label>
            <Select value={isPublic ? "public" : "private"} onValueChange={(v) => setIsPublic(v === "public")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Öffentlich (Team)</SelectItem>
                <SelectItem value="private">Privat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{COPY.roles.accountManager}</Label>
              <Select value={amId || "__none__"} onValueChange={(v) => setAmId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{COPY.roles.salesManager}</Label>
              <Select value={smId || "__none__"} onValueChange={(v) => setSmId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-req">Anforderungen</Label>
            <Textarea
              id="deal-req"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={7}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={submit} disabled={saving || !title.trim()}>
            {saving ? "Speichern …" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

