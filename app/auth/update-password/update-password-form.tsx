'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { updatePasswordAfterReset, type UpdatePasswordResult } from './actions'

function formAction(
  _prev: UpdatePasswordResult | null,
  formData: FormData
): Promise<UpdatePasswordResult> {
  return updatePasswordAfterReset(formData)
}

export function UpdatePasswordForm() {
  const [state, formActionWithState, isPending] = useActionState(formAction, null)

  return (
    <form action={formActionWithState} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="••••••••"
          required
          minLength={12}
          disabled={isPending}
          autoComplete="new-password"
          className="h-10 rounded-lg"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Passwort bestätigen</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          placeholder="••••••••"
          required
          minLength={12}
          disabled={isPending}
          autoComplete="new-password"
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
      <p className="text-xs text-muted-foreground">
        Mindestens 12 Zeichen sowie Groß-/Kleinbuchstaben, Zahl und Sonderzeichen.
      </p>
      <Button type="submit" className="h-10 w-full rounded-lg" disabled={isPending}>
        {isPending ? 'Wird gespeichert …' : 'Passwort speichern'}
      </Button>
    </form>
  )
}
