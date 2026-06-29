'use client'

import { useEffect, useState } from 'react'
import { Copy, ExternalLink, FileDown, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'

import { createSharedPortfolio } from '@/app/dashboard/actions'
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

type CoveredRef = { id: string; title: string; companyName: string | null }

function toAbsoluteUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (typeof window === 'undefined') return url
  return new URL(url, window.location.origin).toString()
}

export function ChampionKitDialog({
  open,
  onOpenChange,
  dealTitle,
  championName,
  coveredReferences,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealTitle: string
  championName: string | null
  coveredReferences: CoveredRef[]
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const referenceIds = coveredReferences.map((r) => r.id)

  useEffect(() => {
    if (!open) {
      setShareUrl(null)
      setSlug(null)
      setCreating(false)
    }
  }, [open])

  const createKit = async () => {
    if (!referenceIds.length) return
    setCreating(true)
    try {
      const result = await createSharedPortfolio(referenceIds)
      if (!result.success) {
        toast.error(result.error ?? 'Champion-Kit konnte nicht erstellt werden.')
        return
      }
      const absolute = toAbsoluteUrl(result.url)
      setShareUrl(absolute)
      setSlug(result.slug)
      await navigator.clipboard.writeText(absolute).catch(() => undefined)
      toast.success('Champion-Kit erstellt — Link in Zwischenablage.')
      if (result.manageToken) {
        const manageUrl = new URL(absolute)
        manageUrl.searchParams.set('manage', result.manageToken)
        toast.message('Sperr-Link für die freigebende Person', {
          description: manageUrl.toString(),
          duration: 20000,
        })
      }
    } finally {
      setCreating(false)
    }
  }

  const pdfHref = slug ? `/api/public-portfolio-pdf?slug=${encodeURIComponent(slug)}` : null
  const pptxHref =
    coveredReferences.length === 1
      ? `/api/reference-onepager-pptx?referenceId=${encodeURIComponent(coveredReferences[0]!.id)}`
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Champion-Kit</DialogTitle>
          <DialogDescription>
            {championName ? (
              <>
                Beweise für <span className="font-medium text-foreground">{championName}</span> zum
                Deal{' '}
              </>
            ) : (
              <>Beweise zum Deal </>
            )}
            <span className="font-medium text-foreground">{dealTitle}</span> als teilbares Portfolio
            bündeln.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {coveredReferences.length} Referenz{coveredReferences.length === 1 ? '' : 'en'} mit
            ausreichender Proof-Abdeckung:
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-3 text-sm">
            {coveredReferences.map((ref) => (
              <li key={ref.id}>
                <span className="font-medium">{ref.title}</span>
                {ref.companyName ? (
                  <span className="text-muted-foreground"> · {ref.companyName}</span>
                ) : null}
              </li>
            ))}
          </ul>

          {shareUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-xs" aria-label="Portfolio-Link" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl)
                      toast.success('Link kopiert')
                    } catch {
                      toast.error('Kopieren fehlgeschlagen')
                    }
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 size-4" />
                    Portfolio öffnen
                  </a>
                </Button>
                {pdfHref ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                      <FileDown className="mr-2 size-4" />
                      PDF exportieren
                    </a>
                  </Button>
                ) : null}
                {pptxHref ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={pptxHref} target="_blank" rel="noopener noreferrer">
                      <FileDown className="mr-2 size-4" />
                      PPTX One-Pager
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          {!shareUrl ? (
            <Button type="button" disabled={creating || referenceIds.length === 0} onClick={() => void createKit()}>
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Package className="mr-2 size-4" />}
              Portfolio-Link erstellen
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
