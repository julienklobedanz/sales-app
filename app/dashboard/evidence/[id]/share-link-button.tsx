'use client'

import { useEffect, useState } from 'react'
import { CopyIcon, ExternalLink, LinkIcon, Loader } from '@hugeicons/core-free-icons'
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

export function ShareLinkButton({ referenceId }: { referenceId: string }) {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getExistingShareForReference(referenceId)
      .then((existing) => setUrl(existing?.url ? sanitizeSharedUrl(existing.url) : null))
      .finally(() => setLoading(false))
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
        <Button variant="outline" className="w-full">
          Link erstellen
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] space-y-3">
        <div className="text-sm font-medium">Kundenlink</div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AppIcon icon={Loader} size={16} className="animate-spin" />
            Wird geladen ...
          </div>
        ) : url ? (
          <div className="space-y-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => copyToClipboard(url)}>
                <AppIcon icon={CopyIcon} size={16} className="mr-2" />
                Kopieren
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <AppIcon icon={ExternalLink} size={16} className="mr-2" />
                  Öffnen
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={creating}
            onClick={async () => {
              setCreating(true)
              try {
                const result = await createSharedPortfolio([referenceId])
                if (!result.success) {
                  toast.error(result.error ?? 'Link konnte nicht erstellt werden.')
                  return
                }
                const sharedUrl = sanitizeSharedUrl(result.url)
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
              <AppIcon icon={LinkIcon} size={16} className="mr-2" />
            )}
            Link erstellen
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
