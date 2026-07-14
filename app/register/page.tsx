import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from './register-form'
import { AUTH_BRAND_CONTENT } from '@/lib/auth/brand-content'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthPageUser } from '@/lib/supabase/safe-auth'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function RegisterPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const user = await getAuthPageUser(supabase)
  if (user) {
    redirect(ROUTES.home)
  }

  const params = await searchParams
  const inviteToken = params.invite?.trim() || null
  const loginHref = inviteToken
    ? `${ROUTES.login}?invite=${encodeURIComponent(inviteToken)}`
    : ROUTES.login

  return (
    <AuthShell
      brandContent={AUTH_BRAND_CONTENT.register}
      topRightLink={{ href: loginHref, label: 'Anmelden' }}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Konto erstellen</h1>
          <p className="text-sm text-gray-500">
            {inviteToken
              ? 'Du wurdest eingeladen. Erstelle dein Konto, um dem Team beizutreten.'
              : 'Gib deine E-Mail und ein Passwort ein, um dein Konto zu erstellen.'}
          </p>
        </div>
        <RegisterForm inviteToken={inviteToken} />
        <p className="text-sm text-gray-500">
          Bereits ein Konto?{' '}
          <Link
            href={loginHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
