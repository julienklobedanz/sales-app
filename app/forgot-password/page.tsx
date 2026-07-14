import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { AUTH_BRAND_CONTENT } from '@/lib/auth/brand-content'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthPageUser } from '@/lib/supabase/safe-auth'
import { ROUTES } from '@/lib/routes'
import { ForgotPasswordForm } from './forgot-password-form'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const supabase = await createServerSupabaseClient()
  const user = await getAuthPageUser(supabase)
  if (user) redirect(ROUTES.home)

  return (
    <AuthShell brandContent={AUTH_BRAND_CONTENT.forgotPassword} topRightLink={{ href: ROUTES.login, label: 'Anmelden' }}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Passwort zurücksetzen</h1>
          <p className="text-sm text-gray-500">
            Wir senden dir einen Link zum Festlegen eines neuen Passworts.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-sm text-gray-500">
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
