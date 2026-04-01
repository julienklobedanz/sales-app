import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { RegisterForm } from './register-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function RegisterPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect(ROUTES.home)
  }

  const params = await searchParams
  const inviteToken = params.invite?.trim() || null
  const loginHref = inviteToken
    ? `${ROUTES.login}?invite=${encodeURIComponent(inviteToken)}`
    : undefined

  return (
    <AuthShell
      topRightLink={{ href: ROUTES.login, label: 'Anmelden' }}
      topRightLinkSearch={inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : undefined}
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Konto erstellen</h1>
          <p className="text-sm text-muted-foreground">
            {inviteToken
              ? 'Du wurdest eingeladen. Erstelle dein Konto, um dem Team beizutreten.'
              : 'Gib deine E-Mail und ein Passwort ein, um dein Konto zu erstellen.'}
          </p>
        </div>
        <RegisterForm inviteToken={inviteToken} />
        <p className="text-center text-sm text-muted-foreground md:text-left">
          Bereits ein Konto?{' '}
          <Link
            href={loginHref ?? ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
