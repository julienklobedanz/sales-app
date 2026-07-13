'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthAlternativeSignIn } from '@/components/auth-alternative-sign-in'
import { ROUTES } from '@/lib/routes'
import { signInWithPassword, type SignInResult } from './actions'

function formAction(_prev: SignInResult | null, formData: FormData) {
  return signInWithPassword(formData)
}

export function LoginForm({
  inviteToken = null,
  registerHref,
}: {
  inviteToken?: string | null
  registerHref: string
}) {
  const router = useRouter()
  const [state, formActionWithState, isPending] = useActionState(formAction, null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const redirectTo = state?.redirectTo
    if (!redirectTo) return
    router.push(redirectTo)
    router.refresh()
  }, [router, state?.redirectTo])

  return (
    <form action={formActionWithState} className="space-y-6">
      {inviteToken ? <input type="hidden" name="invite_token" value={inviteToken} /> : null}
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            placeholder="name@beispiel.de"
            required
            disabled={isPending}
            autoComplete="email"
            autoFocus
            className="h-11 rounded-lg px-3.5 py-2.5 text-base"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="password" className="mb-0">
              Passwort
            </Label>
            <Link
              href={ROUTES.forgotPassword}
              className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Passwort vergessen?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            disabled={isPending}
            autoComplete="current-password"
            className="h-11 rounded-lg px-3.5 py-2.5 text-base"
          />
        </div>
        {state?.error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.error}
          </div>
        )}
        <Button type="submit" className="h-12 w-full rounded-lg text-base" disabled={isPending}>
          {isPending ? 'Wird angemeldet …' : 'Anmelden'}
        </Button>
      </div>

      <div className="space-y-3 pt-1">
        <div className="relative flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            Oder anmelden via
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <AuthAlternativeSignIn
          inviteToken={inviteToken}
          disabled={isPending}
          getEmail={() => emailRef.current?.value ?? ''}
        />

        <p className="text-center text-sm text-gray-500">
          Neu bei RefStack?{' '}
          <Link
            href={registerHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Konto erstellen
          </Link>
        </p>
      </div>
    </form>
  )
}
