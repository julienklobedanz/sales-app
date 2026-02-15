'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithEmail, type SignInResult } from './actions'

function formAction(_prev: SignInResult | null, formData: FormData) {
  return signInWithEmail(formData)
}

export function MagicLinkForm() {
  const [state, formActionWithState, isPending] = useActionState(formAction, null)

  return (
    <form action={formActionWithState} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          E-Mail
        </label>
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
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          Magic Link gesendet! Prüfe deine E-Mails und klicke den Link.
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? 'Wird gesendet …' : 'Magic Link senden'}
      </Button>
    </form>
  )
}
