'use client'

import { useEffect, useRef, useState } from 'react'
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
import { CheckIcon } from '@/components/ui/check-icon'

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
  const [copiedSuccess, setCopiedSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [burstKey, setBurstKey] = useState(0)
  const timeoutRefs = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timer) => window.clearTimeout(timer))
      timeoutRefs.current = []
    }
  }, [])

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
      setCopiedSuccess(true)
      setShowConfetti(true)
      setBurstKey((prev) => prev + 1)

      timeoutRefs.current.push(
        window.setTimeout(() => {
          setCopiedSuccess(false)
        }, 1100)
      )
      timeoutRefs.current.push(
        window.setTimeout(() => {
          setShowConfetti(false)
        }, 650)
      )

      toast.custom(
        () => (
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white px-4 py-3 shadow-lg dark:border-emerald-500/35 dark:from-emerald-500/15 dark:to-background">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Link kopiert!
            </p>
            <p className="mt-0.5 text-xs text-emerald-800/90 dark:text-emerald-100/80">
              Bereit zum Teilen mit dem Kunden.
            </p>
          </div>
        ),
        { duration: 2800 }
      )
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
              <div className="relative">
                {showConfetti ? (
                  <div key={burstKey} className="pointer-events-none absolute inset-0 z-10">
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-400 animate-ping [animation-duration:500ms]" style={{ transform: 'translate(-18px, -14px)' }} />
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-500 animate-ping [animation-duration:550ms]" style={{ transform: 'translate(16px, -16px)' }} />
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-lime-400 animate-ping [animation-duration:520ms]" style={{ transform: 'translate(22px, -2px)' }} />
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-teal-400 animate-ping [animation-duration:560ms]" style={{ transform: 'translate(14px, 14px)' }} />
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-300 animate-ping [animation-duration:530ms]" style={{ transform: 'translate(-20px, 6px)' }} />
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-lime-300 animate-ping [animation-duration:600ms]" style={{ transform: 'translate(-8px, 16px)' }} />
                    <span className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-teal-300 animate-ping [animation-duration:570ms]" style={{ transform: 'translate(2px, -20px)' }} />
                  </div>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={`w-full transition-all duration-200 ${
                    copiedSuccess
                      ? 'scale-105 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200'
                      : ''
                  }`}
                  onClick={() => copyToClipboard(url)}
                >
                  {copiedSuccess ? (
                    <CheckIcon className="mr-2 text-emerald-600 dark:text-emerald-300" />
                  ) : (
                    <AppIcon icon={CopyIcon} size={16} className="mr-2" />
                  )}
                  Kopieren
                </Button>
              </div>
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
