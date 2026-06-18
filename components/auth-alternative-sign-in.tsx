'use client'

import { useState, useTransition } from 'react'
import { Mail01Icon, Shield } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppIcon } from '@/lib/icons'
import { sendMagicLinkSignIn, startSsoSignIn } from '@/app/login/actions'

type AuthAlternativeSignInProps = {
  inviteToken?: string | null
  disabled?: boolean
  getEmail: () => string
}

const ssoEnabled = process.env.NEXT_PUBLIC_AUTH_SSO_ENABLED === '1'

export function AuthAlternativeSignIn({
  inviteToken = null,
  disabled = false,
  getEmail,
}: AuthAlternativeSignInProps) {
  const [ssoOpen, setSsoOpen] = useState(false)
  const [ssoDomain, setSsoDomain] = useState('')
  const [ssoError, setSsoError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isMagicPending, startMagicTransition] = useTransition()
  const [isSsoPending, startSsoTransition] = useTransition()

  const isBusy = disabled || isMagicPending || isSsoPending

  function handleMagicLink() {
    const email = getEmail().trim()
    if (!email) {
      toast.error('Bitte zuerst deine E-Mail-Adresse eingeben.')
      return
    }

    startMagicTransition(async () => {
      const formData = new FormData()
      formData.set('email', email)
      if (inviteToken) formData.set('invite_token', inviteToken)

      const result = await sendMagicLinkSignIn(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setMagicLinkSent(true)
      toast.success(result.success ?? 'Anmelde-Link gesendet.')
    })
  }

  function handleSsoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSsoError(null)

    const domain = ssoDomain.trim() || getEmail().trim()
    if (!domain) {
      setSsoError('Bitte Firmen-Domain oder geschäftliche E-Mail eingeben.')
      return
    }

    startSsoTransition(async () => {
      const formData = new FormData()
      formData.set('domain', domain)
      const email = getEmail().trim()
      if (email) formData.set('email', email)
      if (inviteToken) formData.set('invite_token', inviteToken)

      const result = await startSsoSignIn(formData)
      if (result.error) {
        setSsoError(result.error)
        return
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      }
    })
  }

  return (
    <>
      {magicLinkSent ? (
        <p role="status" className="text-xs text-muted-foreground">
          Anmelde-Link gesendet. Bitte Postfach prüfen.
        </p>
      ) : null}

      <div
        className={
          ssoEnabled
            ? 'grid grid-cols-1 gap-1.5 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-1.5'
        }
      >
        {ssoEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="h-8 w-full rounded-md gap-1 px-2 py-2 text-xs font-normal text-muted-foreground"
            disabled={isBusy}
            onClick={() => {
              setSsoError(null)
              setSsoDomain('')
              setSsoOpen(true)
            }}
          >
            <AppIcon icon={Shield} size={15} className="text-zinc-400" />
            SSO
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full rounded-md gap-1 px-2 py-2 text-xs font-normal text-muted-foreground"
          disabled={isBusy || magicLinkSent}
          onClick={handleMagicLink}
        >
          <AppIcon icon={Mail01Icon} size={15} className="text-zinc-400" />
          {isMagicPending ? 'Wird gesendet …' : 'Magic Link'}
        </Button>
      </div>

      {ssoEnabled ? (
        <Dialog open={ssoOpen} onOpenChange={setSsoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mit SSO anmelden</DialogTitle>
            <DialogDescription>
              Gib deine Firmen-Domain oder geschäftliche E-Mail ein. Du wirst zu deinem
              Identity-Provider weitergeleitet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSsoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sso-domain">Firmen-Domain oder E-Mail</Label>
              <Input
                id="sso-domain"
                name="domain"
                type="text"
                placeholder="firma.de oder name@firma.de"
                value={ssoDomain}
                onChange={(event) => setSsoDomain(event.target.value)}
                disabled={isSsoPending}
                autoComplete="email"
                autoFocus
                className="h-10 rounded-lg"
              />
            </div>
            {ssoError ? (
              <p role="alert" className="text-sm text-destructive">
                {ssoError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSsoOpen(false)} disabled={isSsoPending}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSsoPending}>
                {isSsoPending ? 'Weiterleitung …' : 'Weiter zu SSO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
