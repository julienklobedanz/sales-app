'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Cancel01Icon, Loader, Upload } from '@hugeicons/core-free-icons'
import {
  checkSubdomainAvailability,
  updateOrganization,
} from './settings-workspace-actions'
import type { OrganizationBillingSettings } from '@/lib/organizations/billing-settings'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { normalizeOrgDateDisplayFormat, type OrgDateDisplayFormat } from '@/lib/format'
import { normalizeUiLocale, type UiLocale } from '@/lib/i18n/ui-locale'
import { DIGEST_TIMEZONE_OPTIONS } from '@/lib/market-signals/digest-schedule'
import {
  normalizeSubdomainInput,
  slugifySubdomainFromOrgName,
  validateSubdomainFormat,
} from '@/lib/organizations/subdomain'

export function SettingsWorkspaceCard({
  organizationId,
  organizationName,
  logoUrl,
  primaryColor = '#0f172a',
  secondaryColor = '#334155',
  dateDisplayFormat = 'de-DE',
  uiLocale = 'de',
  subdomain,
  savedSubdomain = '',
  onSubdomainChange,
  billingSettings,
  hideSubmitButton = false,
  saveSignal = 0,
  onDirtyChange,
}: {
  organizationId: string | null
  organizationName: string
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  dateDisplayFormat?: OrgDateDisplayFormat | string | null
  uiLocale?: UiLocale | string | null
  subdomain?: string
  savedSubdomain?: string
  onSubdomainChange?: (value: string) => void
  billingSettings?: OrganizationBillingSettings
  hideSubmitButton?: boolean
  saveSignal?: number
  onDirtyChange?: (dirty: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState(organizationName)
  const [pending, setPending] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl ?? null)
  const [primary, setPrimary] = useState(primaryColor ?? '#0f172a')
  const [secondary, setSecondary] = useState(secondaryColor ?? '#334155')
  const [dateFormat, setDateFormat] = useState<OrgDateDisplayFormat>(() =>
    normalizeOrgDateDisplayFormat(dateDisplayFormat)
  )
  const [locale, setLocale] = useState<UiLocale>(() => normalizeUiLocale(uiLocale))
  const [companyAddress, setCompanyAddress] = useState(billingSettings?.companyAddress ?? '')
  const [vatId, setVatId] = useState(billingSettings?.vatId ?? '')
  const [defaultTimezone, setDefaultTimezone] = useState(
    billingSettings?.defaultTimezone ?? 'Europe/Berlin'
  )
  const [inviteDomains, setInviteDomains] = useState(
    billingSettings?.inviteAllowedEmailDomains ?? ''
  )
  const [logoLoading, setLogoLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [lastHandledSaveSignal, setLastHandledSaveSignal] = useState(0)
  const [subdomainFollowsName, setSubdomainFollowsName] = useState(() => {
    const initial = (subdomain ?? '').trim().toLowerCase()
    if (!initial) return true
    return initial === slugifySubdomainFromOrgName(organizationName)
  })
  const [subdomainStatus, setSubdomainStatus] = useState<{
    checking: boolean
    message: string | null
    ok: boolean | null
  }>({ checking: false, message: null, ok: null })

  const subdomainDirty =
    normalizeSubdomainInput(subdomain ?? '') !== normalizeSubdomainInput(savedSubdomain)
  const isDirty =
    name !== organizationName ||
    primary !== (primaryColor ?? '#0f172a') ||
    secondary !== (secondaryColor ?? '#334155') ||
    dateFormat !== normalizeOrgDateDisplayFormat(dateDisplayFormat) ||
    locale !== normalizeUiLocale(uiLocale) ||
    (logoPreview ?? '') !== (logoUrl ?? '') ||
    subdomainDirty ||
    companyAddress !== (billingSettings?.companyAddress ?? '') ||
    vatId !== (billingSettings?.vatId ?? '') ||
    defaultTimezone !== (billingSettings?.defaultTimezone ?? 'Europe/Berlin') ||
    inviteDomains !== (billingSettings?.inviteAllowedEmailDomains ?? '')

  useEffect(() => {
    setDateFormat(normalizeOrgDateDisplayFormat(dateDisplayFormat))
  }, [dateDisplayFormat])

  useEffect(() => {
    setLocale(normalizeUiLocale(uiLocale))
  }, [uiLocale])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (saveSignal <= 0 || saveSignal === lastHandledSaveSignal || !isDirty) return
    const form = document.getElementById('settings-workspace-form') as HTMLFormElement | null
    if (form) {
      form.requestSubmit()
      setLastHandledSaveSignal(saveSignal)
    }
  }, [isDirty, lastHandledSaveSignal, saveSignal])

  useEffect(() => {
    if (!organizationId || onSubdomainChange == null) return
    const value = normalizeSubdomainInput(subdomain ?? '')
    if (!value) {
      setSubdomainStatus({ checking: false, message: null, ok: null })
      return
    }
    if (value === normalizeSubdomainInput(savedSubdomain)) {
      setSubdomainStatus({ checking: false, message: 'Aktuelle Subdomain', ok: true })
      return
    }
    const formatError = validateSubdomainFormat(value)
    if (formatError) {
      setSubdomainStatus({ checking: false, message: formatError, ok: false })
      return
    }

    let cancelled = false
    setSubdomainStatus({ checking: true, message: 'Prüfe Verfügbarkeit …', ok: null })
    const timer = window.setTimeout(() => {
      void checkSubdomainAvailability(value, organizationId).then((result) => {
        if (cancelled) return
        if (result.available) {
          setSubdomainStatus({ checking: false, message: 'Verfügbar', ok: true })
        } else {
          setSubdomainStatus({
            checking: false,
            message: result.error ?? 'Nicht verfügbar',
            ok: false,
          })
        }
      })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [organizationId, onSubdomainChange, savedSubdomain, subdomain])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!organizationId) return
    setPending(true)
    const result = await updateOrganization(
      organizationId,
      name.trim(),
      logoPreview,
      primary.trim() || '#0f172a',
      secondary.trim() || '#334155',
      dateFormat,
      locale,
      subdomain ?? '',
      {
        companyAddress,
        vatId,
        defaultTimezone,
        inviteAllowedEmailDomains: inviteDomains,
      }
    )
    setPending(false)
    if (result.success) {
      toast.success('Arbeitsbereich aktualisiert')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  function handleLogoFile(file: File | null) {
    if (!file) {
      setLogoPreview(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte ein Bild für das Logo wählen.')
      return
    }
    setLogoLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(typeof reader.result === 'string' ? reader.result : null)
      setLogoLoading(false)
    }
    reader.onerror = () => {
      setLogoLoading(false)
      toast.error('Logo konnte nicht geladen werden.')
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleLogoFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragActive) setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleLogoDelete() {
    setLogoPreview(null)
  }

  return (
    <form id="settings-workspace-form" onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <AppIcon icon={Building2} size={16} />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {COPY.misc.workspace}-Branding
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/30"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              const input = document.getElementById('workspace-logo-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            {logoLoading ? (
              <AppIcon icon={Loader} size={20} className="animate-spin text-muted-foreground" />
            ) : logoPreview ? (
              <>
                <img
                  src={logoPreview}
                  alt={`${COPY.misc.workspace}-Logo`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLogoDelete()
                  }}
                  className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 shadow-sm ring-1 ring-destructive/20 transition-opacity duration-150 group-hover:opacity-100"
                  aria-label="Logo entfernen"
                >
                  <AppIcon icon={Cancel01Icon} size={12} />
                </button>
              </>
            ) : (
              <AppIcon icon={Building2} size={28} className="text-muted-foreground/60" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
            onClick={() => {
              const input = document.getElementById('workspace-logo-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            <AppIcon icon={Upload} size={12} />
            Logo
          </button>
          <input
            id="workspace-logo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              if (file) handleLogoFile(file)
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="workspace-name" className="text-xs">
                Organisation
              </Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => {
                  const nextName = e.target.value
                  setName(nextName)
                  if (onSubdomainChange && subdomainFollowsName) {
                    onSubdomainChange(slugifySubdomainFromOrgName(nextName))
                  }
                }}
                placeholder={
                  organizationId ? 'Name deines Unternehmens' : `Kein ${COPY.misc.workspace} zugeordnet`
                }
                disabled={!organizationId}
                className={`h-9 ${organizationId ? 'bg-background' : 'cursor-not-allowed bg-muted/50'}`}
                aria-label="Organisation"
              />
            </div>
            {onSubdomainChange != null ? (
              <div className="space-y-1">
                <Label htmlFor="workspace-subdomain" className="text-xs">
                  Subdomain
                </Label>
                <Input
                  id="workspace-subdomain"
                  value={subdomain ?? ''}
                  onChange={(e) => {
                    const next = e.target.value
                    setSubdomainFollowsName(
                      next.trim() === '' ||
                        next.trim().toLowerCase() === slugifySubdomainFromOrgName(name)
                    )
                    onSubdomainChange(next)
                  }}
                  placeholder="z.B. deinunternehmen.refstack.com"
                  aria-label="Subdomain"
                  className="h-9"
                />
                {subdomainStatus.message ? (
                  <p
                    className={`text-[11px] ${
                      subdomainStatus.ok === false
                        ? 'text-destructive'
                        : subdomainStatus.ok === true
                          ? 'text-emerald-700'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {subdomainStatus.checking ? (
                      <span className="inline-flex items-center gap-1">
                        <AppIcon icon={Loader} size={12} className="animate-spin" />
                        {subdomainStatus.message}
                      </span>
                    ) : (
                      subdomainStatus.message
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="ui-locale" className="text-xs">
                Sprache
              </Label>
              <Select
                value={locale}
                onValueChange={(v) => setLocale(normalizeUiLocale(v))}
                disabled={!organizationId}
              >
                <SelectTrigger id="ui-locale" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">Englisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-display-format" className="text-xs">
                Datumsformat
              </Label>
              <Select
                value={dateFormat}
                onValueChange={(v) => setDateFormat(normalizeOrgDateDisplayFormat(v))}
                disabled={!organizationId}
              >
                <SelectTrigger id="date-display-format" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de-DE">Deutsch (TT.MM.JJJJ)</SelectItem>
                  <SelectItem value="en-GB">UK (TT/MM/JJJJ)</SelectItem>
                  <SelectItem value="en-US">US (MM/TT/JJJJ)</SelectItem>
                  <SelectItem value="iso">ISO (JJJJ-MM-TT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="primary-color" className="text-xs">
                Primärfarbe
              </Label>
              <Input
                id="primary-color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="#0f172a"
                disabled={!organizationId}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="secondary-color" className="text-xs">
                Sekundärfarbe
              </Label>
              <Input
                id="secondary-color"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                placeholder="#334155"
                disabled={!organizationId}
                className="h-9"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="company-address" className="text-xs">
                Firmenadresse
              </Label>
              <Input
                id="company-address"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Straße, PLZ Ort, Land"
                disabled={!organizationId}
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vat-id" className="text-xs">
                USt-ID
              </Label>
              <Input
                id="vat-id"
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                placeholder="DE123456789"
                disabled={!organizationId}
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="default-timezone" className="text-xs">
                Standard-Zeitzone
              </Label>
              <Select
                value={defaultTimezone}
                onValueChange={setDefaultTimezone}
                disabled={!organizationId}
              >
                <SelectTrigger id="default-timezone" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIGEST_TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                  {defaultTimezone &&
                  !(DIGEST_TIMEZONE_OPTIONS as readonly string[]).includes(defaultTimezone) ? (
                    <SelectItem value={defaultTimezone}>{defaultTimezone}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="invite-domains" className="text-xs">
                Einladungs-Domains
              </Label>
              <Input
                id="invite-domains"
                value={inviteDomains}
                onChange={(e) => setInviteDomains(e.target.value)}
                placeholder="firma.de, partner.com"
                disabled={!organizationId}
                className="h-9 bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      {!hideSubmitButton ? (
        <Button type="submit" size="sm" disabled={pending || !organizationId}>
          Speichern
        </Button>
      ) : null}
    </form>
  )
}
