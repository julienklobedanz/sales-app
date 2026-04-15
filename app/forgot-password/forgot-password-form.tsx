'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendPasswordResetEmail, type ForgotPasswordResult } from './actions'

function formAction(
  _prev: ForgotPasswordResult | null,
  formData: FormData
): Promise<ForgotPasswordResult> {
  return sendPasswordResetEmail(formData)
}

export function ForgotPasswordForm() {
  const [state, formActionWithState, isPending] = useActionState(formAction, null)

  return (
    <form action={formActionWithState} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@beispiel.de"
          required
          disabled={isPending}
          autoComplete="email"
          className="h-10 rounded-lg"
        />
      </div>
      {state?.success ? (
        <div
          role="status"
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
        >
          Wenn ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen
          geschickt.
        </div>
      ) : null}
      {state?.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}
      <Button type="submit" className="h-10 w-full rounded-lg" disabled={isPending || state?.success}>
        {isPending ? 'Wird gesendet …' : 'Link senden'}
      </Button>
    </form>
  )
}
