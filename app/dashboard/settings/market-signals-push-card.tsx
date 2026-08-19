'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { Notification01Icon } from '@hugeicons/core-free-icons'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function MarketSignalsPushCard() {
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected')

  async function enablePush() {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      toast.error('Push wird von diesem Browser nicht unterstützt.')
      return
    }

    setPending(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        toast.error('Benachrichtigungen wurden nicht erlaubt.')
        return
      }

      const vapidRes = await fetch('/api/push/vapid-public-key')
      if (!vapidRes.ok) {
        const j = (await vapidRes.json().catch(() => ({}))) as { error?: string }
        toast.error(j.error ?? 'VAPID-Schlüssel fehlen (Server-Konfiguration).')
        return
      }
      const { publicKey } = (await vapidRes.json()) as { publicKey: string }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await reg.update()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON()
      const endpoint = json.endpoint
      const key = json.keys
      if (!endpoint || !key?.p256dh || !key?.auth) {
        toast.error('Push-Subscription konnte nicht gelesen werden.')
        return
      }

      const save = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, keys: { p256dh: key.p256dh, auth: key.auth } }),
      })
      if (!save.ok) {
        const j = (await save.json().catch(() => ({}))) as { error?: string }
        toast.error(j.error ?? 'Speichern der Subscription fehlgeschlagen.')
        return
      }

      setStatus('connected')
      toast.success(
        'Browser-Benachrichtigungen sind eingerichtet. Aktiviere dazu die Option „Web Push“ und speichere die Benachrichtigungen.',
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Push-Registrierung fehlgeschlagen.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Browser registrieren (Web Push)</p>
          <p className="text-xs text-muted-foreground">
            Status: {status === 'connected' ? 'Verbunden' : 'Nicht verbunden'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void enablePush()}
          disabled={pending}
        >
          <AppIcon icon={Notification01Icon} size={16} className="mr-2" />
          {pending ? COPY.settings.pushEnablePending : COPY.settings.pushEnable}
        </Button>
      </div>
    </Card>
  )
}
