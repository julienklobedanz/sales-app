import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { ForgotPasswordForm } from './forgot-password-form'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect(ROUTES.home)

  return (
    <AuthShell topRightLink={{ href: ROUTES.login, label: 'Anmelden' }}>
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Passwort zurücksetzen</h1>
          <p className="text-sm text-muted-foreground">
            Wir senden dir einen Link zum Festlegen eines neuen Passworts.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground md:text-left">
          <Link
            href={ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
