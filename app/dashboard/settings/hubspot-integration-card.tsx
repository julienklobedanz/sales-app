'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'
import { PlugSocketIcon, Tick01Icon } from '@hugeicons/core-free-icons'

type HubSpotIntegrationCardProps = {
  cardClassName: string
  configured: boolean
  connected: boolean
  canManage: boolean
  externalAccountId: string | null
  lastSyncAt: string | null
}

export function HubSpotIntegrationCard({
  cardClassName,
  configured,
  connected,
  canManage,
  externalAccountId,
  lastSyncAt,
}: HubSpotIntegrationCardProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

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
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-2.5">
          <div className="relative size-7 overflow-hidden rounded-md border border-slate-200 bg-white">
            <Image
              src="/brands/hubspot.png"
              alt="HubSpot Logo"
              fill
              sizes="28px"
              className="object-contain p-1"
            />
          </div>
          <CardTitle className="text-base">HubSpot</CardTitle>
        </div>
        <CardDescription className="text-slate-500">
          Verbinde CRM-Kontakte und Deal-Daten mit RefStack.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-0 pb-0 pt-5">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${
            connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <AppIcon icon={connected ? Tick01Icon : PlugSocketIcon} size={14} />
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
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-center"
                disabled={pending}
                onClick={() => router.push('/dashboard/accounts?crm_import=1')}
              >
                Accounts importieren
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center text-slate-600"
                disabled={pending}
                onClick={handleDisconnect}
              >
                Verbindung trennen
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-full justify-center" asChild>
              <a href="/api/integrations/hubspot/connect">Verbindung einrichten</a>
            </Button>
          )
        ) : !canManage ? (
          <p className="text-xs text-slate-500">Nur Administratoren können CRM-Verbindungen verwalten.</p>
        ) : null}
      </CardContent>
    </div>
  )
}
