'use client'

import Link from 'next/link'
import { useRef } from 'react'
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

export function LoginForm({ inviteToken = null }: { inviteToken?: string | null }) {
  const [state, formActionWithState, isPending] = useActionState(formAction, null)
  const emailRef = useRef<HTMLInputElement>(null)

  return (
    <form action={formActionWithState} className="space-y-3">
      {inviteToken ? <input type="hidden" name="invite_token" value={inviteToken} /> : null}
      <div className="space-y-1.5">
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
          className="h-10 rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
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
          className="h-10 rounded-lg"
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
      <Button type="submit" className="h-10 w-full rounded-lg" disabled={isPending}>
        {isPending ? 'Wird angemeldet …' : 'Anmelden'}
      </Button>

      <div className="relative flex items-center gap-2 pt-0.5">
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
    </form>
  )
}
