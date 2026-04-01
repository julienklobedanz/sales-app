"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileSearch } from "@hugeicons/core-free-icons"

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
import { Textarea } from "@/components/ui/textarea"

import { addReferenceToDealWithScore } from "../actions"
import { matchReferences } from "@/app/dashboard/actions"

export function FindMatchesDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<
    Array<{ id: string; title: string; summary: string | null; similarity: number }> | null
  >(null)

  async function run() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setMatches(null)
    try {
      const res = await matchReferences(q, dealId, {
        matchCount: 10,
        matchThreshold: 0.6,
        rerank: false,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setMatches(
        res.matches.map((m) => ({
          id: m.id,
          title: m.title,
          summary: m.summary,
          similarity: m.similarity,
        }))
      )
    } finally {
      setLoading(false)
    }
  }

  async function link(m: { id: string; similarity: number }) {
    const res = await addReferenceToDealWithScore({
      dealId,
      referenceId: m.id,
      similarityScore: m.similarity,
    })
    if (!res.success) toast.error(res.error ?? "Konnte Referenz nicht verknüpfen.")
    else toast.success("Referenz übernommen.")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="w-full">
          <AppIcon icon={FileSearch} size={16} className="mr-2" />
          Treffer finden
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Passende Referenzen finden</DialogTitle>
          <DialogDescription>Freitext eingeben – wir suchen semantisch in euren Referenzen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="match-query">Suchtext</Label>
            <Textarea
              id="match-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              placeholder="z. B. Cloud Landing Zone, SAP Migration, ISO27001 …"
            />
          </div>
          <Button onClick={run} disabled={loading || !query.trim()}>
            {loading ? "Suche …" : "Suchen"}
          </Button>

          {matches?.length ? (
            <div className="space-y-2 max-h-[52vh] overflow-y-auto rounded-md border p-3">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    {m.summary ? (
                      <div className="text-sm text-muted-foreground line-clamp-2">{m.summary}</div>
                    ) : null}
                    <div className="text-xs text-muted-foreground mt-1">
                      {(m.similarity * 100).toFixed(0)}% Ähnlichkeit
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => link({ id: m.id, similarity: m.similarity })}>
                    In Deal übernehmen
                  </Button>
                </div>
              ))}
            </div>
          ) : matches && matches.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Treffer.</div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

