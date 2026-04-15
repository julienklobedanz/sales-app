import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { UpdatePasswordForm } from './update-password-form'

export const dynamic = 'force-dynamic'

export default async function UpdatePasswordPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`${ROUTES.login}?error=session`)
  }

  return (
    <AuthShell topRightLink={{ href: ROUTES.login, label: 'Anmelden' }}>
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Neues Passwort festlegen</h1>
          <p className="text-sm text-muted-foreground">Wähle ein sicheres Passwort für dein Konto.</p>
        </div>
        <UpdatePasswordForm />
        <p className="text-center text-sm text-muted-foreground md:text-left">
          <Link
            href={ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Zur Anmeldung
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
