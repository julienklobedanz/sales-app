'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { unlockPublicPortfolioEmail } from '../actions'
import { SquareLock02Icon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

export function PortfolioEmailUnlockGate({ slug }: { slug: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await unlockPublicPortfolioEmail(slug, name, email)
      if (!res.success) {
        if (res.error === 'expired') {
          toast.error('Dieser Link ist abgelaufen.')
        } else {
          toast.error('Freischaltung fehlgeschlagen.')
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
      <div className="w-full max-w-md rounded-2xl border bg-card/95 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <AppIcon
              icon={SquareLock02Icon}
              size={22}
              className="text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Kurz vor dem Inhalt</h1>
            <p className="text-sm text-muted-foreground">
              Bitte Name und geschäftliche E-Mail eingeben, um die Referenz anzusehen.
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio-gate-name">Name</Label>
            <Input
              id="portfolio-gate-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio-gate-email">E-Mail</Label>
            <Input
              id="portfolio-gate-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !name.trim() || !email.trim()}
          >
            {busy ? 'Wird geprüft …' : 'Inhalt anzeigen'}
          </Button>
        </form>
      </div>
    </div>
  )
}
