'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { CrmImportPreviewDialog } from '@/app/dashboard/accounts/components/crm-import-preview-dialog'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCrmOAuthCallback } from '@/hooks/use-crm-oauth-callback'
import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'
import { AppIcon } from '@/lib/icons'
import { PlugSocketIcon, Tick01Icon } from '@hugeicons/core-free-icons'

type HubSpotIntegrationCardProps = {
  cardClassName: string
  configured: boolean
  connected: boolean
  canManage: boolean
  externalAccountId: string | null
  lastSyncAt: string | null
  compact?: boolean
}

export function HubSpotIntegrationCard({
  cardClassName,
  configured,
  connected,
  canManage,
  externalAccountId,
  lastSyncAt,
  compact = false,
}: HubSpotIntegrationCardProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [crmImportOpen, setCrmImportOpen] = useState(false)

  const openCrmImport = useCallback(() => setCrmImportOpen(true), [])

  useCrmOAuthCallback({
    canConnectCrm: canManage,
    hubspotConnected: connected,
    onOpenImport: openCrmImport,
  })

  async function handleDisconnect() {
    setPending(true)
    try {
      const res = await fetch('/api/integrations/hubspot/disconnect', { method: 'POST' })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? 'Trennen fehlgeschlagen.')
        return
      }
      toast.success('HubSpot-Verbindung getrennt.')
      router.refresh()
    } catch {
      toast.error('Trennen fehlgeschlagen.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cardClassName}>
      <CardHeader className={compact ? 'space-y-1.5 px-0 pt-0 pb-0' : 'px-0 pt-0'}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative size-7 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
              <Image
                src="/brands/hubspot.png"
                alt="HubSpot Logo"
                fill
                sizes="28px"
                className="object-contain p-1"
              />
            </div>
            <CardTitle className={compact ? 'truncate text-sm font-semibold' : 'text-base'}>
              HubSpot
            </CardTitle>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
            Live
          </span>
        </div>
        <CardDescription
          className={compact ? 'line-clamp-1 text-xs text-slate-500' : 'text-slate-500'}
          title="Verbinde CRM-Kontakte und Deal-Daten mit RefStack."
        >
          Verbinde CRM-Kontakte und Deal-Daten mit RefStack.
        </CardDescription>
      </CardHeader>
      <CardContent className={compact ? 'space-y-2.5 px-0 pb-0 pt-3' : 'space-y-5 px-0 pb-0 pt-5'}>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${
            connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <AppIcon icon={connected ? Tick01Icon : PlugSocketIcon} size={12} />
          {connected ? 'Verbunden' : 'Nicht verbunden'}
        </div>

        {!configured ? (
          <p className="text-xs text-slate-500">
            HubSpot OAuth ist noch nicht konfiguriert (HUBSPOT_CLIENT_ID / HUBSPOT_CLIENT_SECRET).
          </p>
        ) : null}

        {connected && externalAccountId ? (
          <p className="text-xs text-slate-500">Portal-ID: {externalAccountId}</p>
        ) : null}

        {connected && lastSyncAt ? (
          <p className="text-xs text-slate-500">
            Letzter Import: {new Date(lastSyncAt).toLocaleString('de-DE')}
          </p>
        ) : null}

        {canManage && configured ? (
          connected ? (
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-center"
                disabled={pending}
                onClick={() => setCrmImportOpen(true)}
              >
                Accounts importieren
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-center text-slate-600"
                disabled={pending}
                onClick={handleDisconnect}
              >
                Verbindung trennen
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full justify-center"
              asChild
            >
              <a href={getHubSpotConnectHref('settings')}>Verbindung einrichten</a>
            </Button>
          )
        ) : !canManage ? (
          <p className="text-xs text-slate-500">
            Nur Administratoren können CRM-Verbindungen verwalten.
          </p>
        ) : null}
      </CardContent>

      {canManage && connected ? (
        <CrmImportPreviewDialog open={crmImportOpen} onOpenChange={setCrmImportOpen} />
      ) : null}
    </div>
  )
}
