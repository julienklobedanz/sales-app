'use client'

import { useState } from 'react'
import {
  CopyIcon,
  ExternalLink,
  Loader,
  RefreshCw,
  Shield,
  SquareLock02Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PopoverContent } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AppIcon } from '@/lib/icons'
import { getPortfolioViewSessions } from '@/app/dashboard/actions'
import { CheckIcon } from '@/components/ui/check-icon'
import {
  defaultExpiryDateInput,
  generateClientPassword,
  toDateInputValue,
} from './share-link-helpers'

type ViewSession = Awaited<ReturnType<typeof getPortfolioViewSessions>>[number]

export function ShareLinkPopoverPanel({
  loading,
  loadError,
  url,
  metaExpiresAt,
  metaHasPassword,
  viewSessions,
  creating,
  copiedSuccess,
  showConfetti,
  burstKey,
  manageUrl,
  hasCustomerManageToken,
  issuingManage,
  onRetryCreate,
  onOpenSecurity,
  onCopyUrl,
  onCreateNew,
  onCopyManage,
  onRequestManageToken,
}: {
  loading: boolean
  loadError: string | null
  url: string | null
  metaExpiresAt: string | null
  metaHasPassword: boolean
  viewSessions: ViewSession[]
  creating: boolean
  copiedSuccess: boolean
  showConfetti: boolean
  burstKey: number
  manageUrl: string | null
  hasCustomerManageToken: boolean
  issuingManage: boolean
  onRetryCreate: () => void
  onOpenSecurity: () => void
  onCopyUrl: (link: string) => void
  onCreateNew: () => void
  onCopyManage: (link: string) => void
  onRequestManageToken: () => void
}) {
  const [nowMs] = useState(() => Date.now())

  return (
    <PopoverContent
      align="start"
      className="w-[520px] max-w-[calc(100vw-2rem)] space-y-3"
    >
      <div className="text-sm font-medium">Kundenlink</div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AppIcon icon={Loader} size={16} className="animate-spin" />
          Wird geladen ...
        </div>
      ) : loadError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={onRetryCreate}>
            Erneut versuchen
          </Button>
        </div>
      ) : url ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Kundenansicht (zum Weitergeben)
          </p>
          <Input value={url} readOnly className="font-mono text-xs" />
          {(metaExpiresAt || metaHasPassword) && (
            <p className="text-xs text-slate-500">
              {metaHasPassword ? 'Passwortschutz aktiv.' : 'Ohne Passwortschutz.'}
              {metaExpiresAt
                ? ` Gültig bis ${new Date(metaExpiresAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}.`
                : ' Kein Ablaufdatum.'}
            </p>
          )}
          {viewSessions.length > 0 ? (
            <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Letzte Ansichten
              </p>
              <ul className="space-y-1 text-xs text-foreground/90">
                {viewSessions.map((s) => {
                  const mins = Math.max(1, Math.round(s.activeSeconds / 60))
                  const who = s.recipientLabel || s.visitorName || 'Anonym'
                  const when = new Date(s.startedAt)
                  const agoMin = Math.max(
                    0,
                    Math.round((nowMs - when.getTime()) / 60_000),
                  )
                  const agoLabel =
                    agoMin < 60
                      ? `vor ${agoMin} Min`
                      : `vor ${Math.round(agoMin / 60)} Std`
                  return (
                    <li key={s.id}>
                      {who} · {s.countryCode ?? '—'} · {mins} Min · {agoLabel}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full px-2"
              title="Passwort & Ablaufdatum"
              onClick={onOpenSecurity}
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
                onClick={() => onCopyUrl(url)}
              >
                {copiedSuccess ? (
                  <CheckIcon className="mr-1 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <AppIcon icon={CopyIcon} size={16} className="mr-1" />
                )}
                Kopieren
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full px-2"
              asChild
            >
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
              onClick={onCreateNew}
            >
              {creating ? (
                <AppIcon icon={Loader} size={16} className="mr-1 animate-spin" />
              ) : (
                <AppIcon icon={RefreshCw} size={16} className="mr-1" />
              )}
              Neu
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border border-amber-200/90 bg-amber-50/60 px-3 py-3 dark:border-amber-500/25 dark:bg-amber-500/10">
            <div className="flex items-start gap-2">
              <AppIcon
                icon={Shield}
                size={18}
                className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-200"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                  Nur für die freigebende Person (Sperrrecht)
                </p>
                <p className="text-xs leading-relaxed text-amber-900/85 dark:text-amber-100/85">
                  Dieser zweite Link zeigt dieselbe Kundenansicht, ermöglicht aber das
                  sofortige Sperren. Nicht an Kolleginnen weitergeben, die nur die
                  Referenz sehen sollen.
                </p>
              </div>
            </div>
            {manageUrl ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => onCopyManage(manageUrl)}
                >
                  <AppIcon icon={Shield} size={14} />
                  Sperr-Link kopieren
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={manageUrl} target="_blank" rel="noopener noreferrer">
                    <AppIcon icon={ExternalLink} size={14} className="mr-1" />
                    Sperr-Link öffnen
                  </a>
                </Button>
              </div>
            ) : (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={issuingManage || !url}
                  onClick={onRequestManageToken}
                >
                  {issuingManage ? (
                    <AppIcon icon={Loader} size={14} className="animate-spin" />
                  ) : (
                    <AppIcon icon={Shield} size={14} />
                  )}
                  {hasCustomerManageToken
                    ? 'Neuen Sperr-Link erzeugen'
                    : 'Sperr-Link einrichten / anzeigen'}
                </Button>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Das Geheimnis wird nur hier einmal angezeigt – bitte gleich kopieren
                  oder erneut erzeugen.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Link wird vorbereitet ...</div>
      )}
    </PopoverContent>
  )
}

export function ShareLinkSecurityDialog({
  open,
  onOpenChange,
  metaHasPassword,
  secPassword,
  setSecPassword,
  secExpires,
  setSecExpires,
  secNoExpiry,
  setSecNoExpiry,
  secRemovePw,
  setSecRemovePw,
  secGateMode,
  setSecGateMode,
  secSaving,
  maxDateStr,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  metaHasPassword: boolean
  secPassword: string
  setSecPassword: (value: string) => void
  secExpires: string
  setSecExpires: (value: string) => void
  secNoExpiry: boolean
  setSecNoExpiry: (value: boolean) => void
  secRemovePw: boolean
  setSecRemovePw: (value: boolean) => void
  secGateMode: 'none' | 'password' | 'email'
  setSecGateMode: (value: 'none' | 'password' | 'email') => void
  secSaving: boolean
  maxDateStr: string
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            Zugang, Passwort und Ablaufdatum gelten für diesen Kundenlink.
            Besucher-Tracking (Land, Aktivzeit) erfolgt ohne Speicherung der IP.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="sec-gate">Zugang</Label>
            <select
              id="sec-gate"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={secGateMode}
              onChange={(e) =>
                setSecGateMode(e.target.value as 'none' | 'password' | 'email')
              }
            >
              <option value="none">Offen</option>
              <option value="password">Passwort</option>
              <option value="email">Name + E-Mail</option>
            </select>
          </div>
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
          <div
            className={`space-y-2 ${secRemovePw ? 'pointer-events-none opacity-40' : ''}`}
          >
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
            <div
              className={`flex items-center gap-2 ${secNoExpiry ? 'pointer-events-none opacity-40' : ''}`}
            >
              <Label
                htmlFor="sec-exp"
                className="w-24 shrink-0 text-sm text-muted-foreground"
              >
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onSave} disabled={secSaving}>
            {secSaving ? 'Speichert …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ShareLinkSperrlinkConfirmDialog({
  open,
  onOpenChange,
  customerEmail,
  issuingManage,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerEmail: string | null
  issuingManage: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Neuen Sperrlink erzeugen?</AlertDialogTitle>
          <AlertDialogDescription>
            Es wird ein neuer Sperrlink generiert und automatisch per Mail an deinen
            Kunden <span className="font-medium text-foreground">{customerEmail}</span>{' '}
            geschickt. Möchtest du fortfahren?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={issuingManage}>Nein</AlertDialogCancel>
          <AlertDialogAction
            disabled={issuingManage}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            Ja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
