'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp, type SignUpResult } from './actions'

function formAction(_prev: SignUpResult | null, formData: FormData) {
  return signUp(formData)
}

export function RegisterForm({ inviteToken = null }: { inviteToken?: string | null }) {
  const [state, formActionWithState, isPending] = useActionState(formAction, null)

  return (
    <form action={formActionWithState} className="space-y-4">
      {inviteToken ? <input type="hidden" name="invite_token" value={inviteToken} /> : null}
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="du@beispiel.de"
          required
          disabled={isPending}
          autoComplete="email"
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Mindestens 6 Zeichen"
          required
          minLength={6}
          disabled={isPending}
          autoComplete="new-password"
          className="w-full"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          Konto erstellt. Prüfe deine E-Mails und bestätige den Link – danach kannst du dich anmelden.
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? 'Wird erstellt …' : 'Konto erstellen'}
      </Button>
    </form>
  )
}
