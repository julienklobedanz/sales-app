'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { CrmImportPreviewItem } from '@/lib/crm/types'

type CrmImportPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: 'hubspot'
}

const matchStatusLabel: Record<CrmImportPreviewItem['matchStatus'], string> = {
  new: 'Neu',
  linked: 'Verknüpfen',
  existing: 'Bereits verbunden',
}

export function CrmImportPreviewDialog({
  open,
  onOpenChange,
  provider = 'hubspot',
}: CrmImportPreviewDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [items, setItems] = useState<CrmImportPreviewItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/integrations/${provider}/discover`)
      .then(async (res) => {
        const json = (await res.json()) as {
          error?: string
          items?: CrmImportPreviewItem[]
        }
        if (!res.ok) {
          throw new Error(json.error ?? 'Discovery fehlgeschlagen.')
        }
        if (!cancelled) {
          setItems(
            (json.items ?? []).map((item) => ({
              ...item,
              selected: item.matchStatus !== 'existing',
            }))
          )
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Discovery fehlgeschlagen.')
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, provider])

  const selectedItems = useMemo(() => items.filter((item) => item.selected), [items])
  const selectedOpportunityCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.opportunities.length, 0),
    [selectedItems]
  )

  function toggleItem(externalAccountId: string, checked: boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.externalAccountId === externalAccountId ? { ...item, selected: checked } : item
      )
    )
  }

  async function handleImport() {
    if (!selectedItems.length) {
      toast.error('Bitte mindestens einen Account auswählen.')
      return
    }

    setImporting(true)
    try {
      const res = await fetch(`/api/integrations/${provider}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: selectedItems.map(({ externalAccountId, name, website, opportunities }) => ({
            externalAccountId,
            name,
            website,
            opportunities,
          })),
        }),
      })
      const json = (await res.json()) as {
        error?: string
        createdAccounts?: number
        linkedAccounts?: number
        createdDeals?: number
        enrichedAccounts?: number
      }

      if (!res.ok) {
        toast.error(json.error ?? 'Import fehlgeschlagen.')
        return
      }

      toast.success(
        `${json.createdAccounts ?? 0} Accounts angelegt, ${json.linkedAccounts ?? 0} verknüpft, ${json.createdDeals ?? 0} Deals importiert.`
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Import fehlgeschlagen.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>HubSpot-Accounts importieren</DialogTitle>
          <DialogDescription>
            Wir haben Accounts mit offenen Opportunities in HubSpot gefunden. Wähle aus, welche nach
            RefStack übernommen werden sollen.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Accounts werden geladen…
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Keine Accounts mit offenen Opportunities gefunden.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.externalAccountId}
                  className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3"
                >
                  <Checkbox
                    checked={Boolean(item.selected)}
                    disabled={item.matchStatus === 'existing'}
                    onCheckedChange={(checked) =>
                      toggleItem(item.externalAccountId, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{item.name}</p>
                      <Badge variant="outline">{matchStatusLabel[item.matchStatus]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.opportunities.length} offene{' '}
                      {item.opportunities.length === 1 ? 'Opportunity' : 'Opportunities'}
                      {item.website ? ` · ${item.website}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground sm:mr-auto">
            {selectedItems.length} Accounts · {selectedOpportunityCount} Opportunities
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={loading || importing || !selectedItems.length}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Importiere…
                </>
              ) : (
                'Importieren'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
