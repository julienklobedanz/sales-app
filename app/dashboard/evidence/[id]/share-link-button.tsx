'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CopyIcon,
  ExternalLink,
  LinkIcon,
  Loader,
  RefreshCw,
  SquareLock02Icon,
} from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppIcon } from '@/lib/icons'
import {
  createSharedPortfolio,
  getExistingShareForReference,
  updateShareLinkSecurity,
} from '@/app/dashboard/actions'
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

function generateClientPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return out
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultExpiryDateInput(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return toDateInputValue(d.toISOString())
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
  const [metaExpiresAt, setMetaExpiresAt] = useState<string | null>(null)
  const [metaHasPassword, setMetaHasPassword] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [copiedSuccess, setCopiedSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [burstKey, setBurstKey] = useState(0)
  const timeoutRefs = useRef<number[]>([])

  const [securityOpen, setSecurityOpen] = useState(false)
  const [secPassword, setSecPassword] = useState('')
  const [secExpires, setSecExpires] = useState('')
  const [secNoExpiry, setSecNoExpiry] = useState(false)
  const [secRemovePw, setSecRemovePw] = useState(false)
  const [secSaving, setSecSaving] = useState(false)

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timer) => window.clearTimeout(timer))
      timeoutRefs.current = []
    }
  }, [])

  useEffect(() => {
    if (!securityOpen) return
    setSecPassword('')
    setSecExpires(toDateInputValue(metaExpiresAt) || defaultExpiryDateInput())
    setSecNoExpiry(!metaExpiresAt)
    setSecRemovePw(false)
  }, [securityOpen, metaExpiresAt])

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
          setMetaExpiresAt(existing.expiresAt)
          setMetaHasPassword(existing.hasPassword)
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
        if (created.initialPassword) {
          toast.message('Passwort für diesen Link', {
            description: `Einmalig anzeigen: ${created.initialPassword}`,
            duration: 20000,
          })
          setMetaHasPassword(true)
        } else {
          setMetaHasPassword(false)
        }
        const again = await getExistingShareForReference(referenceId)
        if (again) {
          setMetaExpiresAt(again.expiresAt)
          setMetaHasPassword(again.hasPassword)
        }
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

  async function saveSecurity() {
    setSecSaving(true)
    try {
      const expiresIso =
        secNoExpiry || !secExpires
          ? null
          : new Date(`${secExpires}T23:59:59.000Z`).toISOString()
      const res = await updateShareLinkSecurity(referenceId, {
        passwordPlain: secRemovePw ? null : secPassword.trim() ? secPassword.trim() : null,
        removePassword: secRemovePw,
        expiresAtIso: expiresIso,
        clearExpires: secNoExpiry,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Sicherheitseinstellungen gespeichert')
      setSecurityOpen(false)
      const again = await getExistingShareForReference(referenceId)
      if (again) {
        setMetaExpiresAt(again.expiresAt)
        setMetaHasPassword(again.hasPassword)
      }
    } finally {
      setSecSaving(false)
    }
  }

  const maxPicker = new Date()
  maxPicker.setFullYear(maxPicker.getFullYear() + 10)
  const maxDateStr = toDateInputValue(maxPicker.toISOString())

  return (
    <>
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
        <PopoverContent align="start" className="w-[520px] max-w-[calc(100vw-2rem)] space-y-3">
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
                    if (created.initialPassword) {
                      toast.message('Passwort für diesen Link', {
                        description: created.initialPassword,
                        duration: 20000,
                      })
                    }
                    const again = await getExistingShareForReference(referenceId)
                    if (again) {
                      setMetaExpiresAt(again.expiresAt)
                      setMetaHasPassword(again.hasPassword)
                    }
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                Erneut versuchen
              </Button>
            </div>
          ) : url ? (
            <div className="space-y-3">
              <Input value={url} readOnly className="font-mono text-xs" />
              {(metaExpiresAt || metaHasPassword) && (
                <p className="text-xs text-slate-500">
                  {metaHasPassword ? 'Passwortschutz aktiv.' : 'Ohne Passwortschutz.'}
                  {metaExpiresAt
                    ? ` Gültig bis ${new Date(metaExpiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}.`
                    : ' Kein Ablaufdatum.'}
                </p>
              )}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full px-2"
                  title="Passwort & Ablaufdatum"
                  onClick={() => setSecurityOpen(true)}
                >
                  <AppIcon icon={SquareLock02Icon} size={16} />
                </Button>
                <div className="relative">
                  {showConfetti ? (
                    <div key={burstKey} className="pointer-events-none absolute inset-0 z-10">
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-400 animate-ping [animation-duration:500ms]"
                        style={{ transform: 'translate(-18px, -14px)' }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-500 animate-ping [animation-duration:550ms]"
                        style={{ transform: 'translate(16px, -16px)' }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-lime-400 animate-ping [animation-duration:520ms]"
                        style={{ transform: 'translate(22px, -2px)' }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-teal-400 animate-ping [animation-duration:560ms]"
                        style={{ transform: 'translate(14px, 14px)' }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-300 animate-ping [animation-duration:530ms]"
                        style={{ transform: 'translate(-20px, 6px)' }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-lime-300 animate-ping [animation-duration:600ms]"
                        style={{ transform: 'translate(-8px, 16px)' }}
                      />
                      <span
                        className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-teal-300 animate-ping [animation-duration:570ms]"
                        style={{ transform: 'translate(2px, -20px)' }}
                      />
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
                      <CheckIcon className="mr-1 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <AppIcon icon={CopyIcon} size={16} className="mr-1" />
                    )}
                    Kopieren
                  </Button>
                </div>
                <Button type="button" size="sm" variant="outline" className="w-full px-2" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <AppIcon icon={ExternalLink} size={16} className="mr-1" />
                    Öffnen
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full px-2"
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
                      if (result.initialPassword) {
                        toast.message('Neues Passwort', {
                          description: result.initialPassword,
                          duration: 20000,
                        })
                      }
                      const again = await getExistingShareForReference(referenceId)
                      if (again) {
                        setMetaExpiresAt(again.expiresAt)
                        setMetaHasPassword(again.hasPassword)
                      }
                      await copyToClipboard(sharedUrl)
                    } finally {
                      setCreating(false)
                    }
                  }}
                >
                  {creating ? (
                    <AppIcon icon={Loader} size={16} className="mr-1 animate-spin" />
                  ) : (
                    <AppIcon icon={RefreshCw} size={16} className="mr-1" />
                  )}
                  Neu
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Link wird vorbereitet ...</div>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent
          className="sm:max-w-md"
          overlayClassName="bg-slate-950/45 backdrop-blur-sm"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AppIcon icon={SquareLock02Icon} size={18} />
              Linkschutz
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-500">
              Passwort und Ablaufdatum gelten für diesen Kundenlink. Das Passwort wird verschlüsselt gespeichert und
              kann später nicht wieder angezeigt werden.
            </p>
            {metaHasPassword ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rm-pw"
                  checked={secRemovePw}
                  onCheckedChange={(v) => setSecRemovePw(v === true)}
                />
                <Label htmlFor="rm-pw" className="text-sm font-normal">
                  Passwortschutz entfernen
                </Label>
              </div>
            ) : null}
            <div className={`space-y-2 ${secRemovePw ? 'pointer-events-none opacity-40' : ''}`}>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="sec-pw">Passwort</Label>
                  <Input
                    id="sec-pw"
                    className="font-mono text-sm"
                    value={secPassword}
                    onChange={(e) => setSecPassword(e.target.value)}
                    placeholder={metaHasPassword ? 'Neues Passwort setzen' : 'Optional'}
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  disabled={secRemovePw}
                  onClick={() => setSecPassword(generateClientPassword())}
                >
                  Generieren
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="no-exp"
                  checked={secNoExpiry}
                  onCheckedChange={(v) => {
                    const on = v === true
                    setSecNoExpiry(on)
                    if (!on && !secExpires) setSecExpires(defaultExpiryDateInput())
                  }}
                />
                <Label htmlFor="no-exp" className="text-sm font-normal">
                  Kein Ablaufdatum
                </Label>
              </div>
              <div className={`flex items-center gap-2 ${secNoExpiry ? 'pointer-events-none opacity-40' : ''}`}>
                <Label htmlFor="sec-exp" className="w-24 shrink-0 text-sm text-muted-foreground">
                  Gültig bis
                </Label>
                <Input
                  id="sec-exp"
                  type="date"
                  className="font-mono text-sm"
                  value={secExpires}
                  min={toDateInputValue(new Date().toISOString())}
                  max={maxDateStr}
                  onChange={(e) => setSecExpires(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSecurityOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void saveSecurity()} disabled={secSaving}>
              {secSaving ? 'Speichert …' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
