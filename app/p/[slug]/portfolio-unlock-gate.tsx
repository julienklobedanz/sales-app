'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { unlockPublicPortfolio } from '../actions'
import { SquareLock02Icon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

export function PortfolioUnlockGate({ slug }: { slug: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await unlockPublicPortfolio(slug, password)
      if (!res.success) {
        if (res.error === 'invalid_password') {
          toast.error('Passwort ist ungültig.')
        } else if (res.error === 'rate_limited') {
          toast.error('Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.')
        } else if (res.error === 'expired') {
          toast.error('Dieser Link ist abgelaufen.')
        } else {
          toast.error('Entsperren fehlgeschlagen.')
        }
        return
      }
      toast.success('Zugriff freigeschaltet')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/25 p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
            <AppIcon
              icon={SquareLock02Icon}
              size={22}
              className="text-foreground"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Geschützter Kundenlink
            </h1>
            <p className="text-sm text-muted-foreground">
              Diese Referenz ist passwortgeschützt. Bitte Passwort eingeben.
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio-pw">Passwort</Label>
            <Input
              id="portfolio-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !password.trim()}>
            {busy ? 'Wird geprüft …' : 'Inhalt anzeigen'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
