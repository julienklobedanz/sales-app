'use client'

import { useEffect, useState } from 'react'
import { CopyIcon, ExternalLink, LinkIcon, Loader, RefreshCw } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AppIcon } from '@/lib/icons'
import { createSharedPortfolio, getExistingShareForReference } from '@/app/dashboard/actions'

function sanitizeSharedUrl(url: string) {
  return url.replace(/\[([^\]]+)\]/g, '$1').replace(/\[|\]/g, '')
}

function toAbsoluteUrl(url: string) {
  const clean = sanitizeSharedUrl(url)
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean
  if (typeof window === 'undefined') return clean
  return new URL(clean, window.location.origin).toString()
}

export function ShareLinkButton({
  referenceId,
  triggerClassName,
}: {
  referenceId: string
  triggerClassName?: string
}) {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadOrCreateShareUrl() {
      setLoading(true)
      setLoadError(null)
      try {
        const existing = await getExistingShareForReference(referenceId)
        if (cancelled) return
        if (existing?.url) {
          setUrl(toAbsoluteUrl(existing.url))
          return
        }

        const created = await createSharedPortfolio([referenceId])
        if (cancelled) return
        if (!created.success) {
          setLoadError(created.error ?? 'Link konnte nicht erstellt werden.')
          setUrl(null)
          return
        }
        setUrl(toAbsoluteUrl(created.url))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOrCreateShareUrl()
    return () => {
      cancelled = true
    }
  }, [open, referenceId])

  async function copyToClipboard(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link kopiert')
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={triggerClassName ? `gap-2 ${triggerClassName}` : 'gap-2'}
        >
          <AppIcon icon={LinkIcon} size={16} />
          Teilen
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[460px] max-w-[calc(100vw-2rem)] space-y-3">
        <div className="text-sm font-medium">Kundenlink</div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AppIcon icon={Loader} size={16} className="animate-spin" />
            Wird geladen ...
          </div>
        ) : loadError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                setLoading(true)
                setLoadError(null)
                try {
                  const created = await createSharedPortfolio([referenceId])
                  if (!created.success) {
                    setLoadError(created.error ?? 'Link konnte nicht erstellt werden.')
                    return
                  }
                  setUrl(toAbsoluteUrl(created.url))
                } finally {
                  setLoading(false)
                }
              }}
            >
              Erneut versuchen
            </Button>
          </div>
        ) : url ? (
          <div className="space-y-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => copyToClipboard(url)}>
                <AppIcon icon={CopyIcon} size={16} className="mr-2" />
                Kopieren
              </Button>
              <Button type="button" size="sm" variant="outline" className="w-full" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <AppIcon icon={ExternalLink} size={16} className="mr-2" />
                  Öffnen
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                disabled={creating}
                onClick={async () => {
                  setCreating(true)
                  try {
                    const result = await createSharedPortfolio([referenceId])
                    if (!result.success) {
                      toast.error(result.error ?? 'Neuer Link konnte nicht erstellt werden.')
                      return
                    }
                    const sharedUrl = toAbsoluteUrl(result.url)
                    setUrl(sharedUrl)
                    await copyToClipboard(sharedUrl)
                  } finally {
                    setCreating(false)
                  }
                }}
              >
                {creating ? (
                  <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                ) : (
                  <AppIcon icon={RefreshCw} size={16} className="mr-2" />
                )}
                Neuer Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Link wird vorbereitet ...</div>
        )}
      </PopoverContent>
    </Popover>
  )
}
