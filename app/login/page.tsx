import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from './login-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.organization_id) {
      redirect(ROUTES.onboarding)
    }
    redirect(ROUTES.home)
  }

  const params = await searchParams
  const inviteToken = params.invite?.trim() || null
  const registerHref = inviteToken
    ? `${ROUTES.register}?invite=${encodeURIComponent(inviteToken)}`
    : undefined

  return (
    <AuthShell
      topRightLink={{ href: ROUTES.register, label: 'Registrieren' }}
      topRightLinkSearch={inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : undefined}
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Bei Ihrem Konto anmelden</h1>
          {inviteToken ? (
            <p className="text-sm text-muted-foreground">
              Melde dich an, um der Einladung beizutreten.
            </p>
          ) : null}
        </div>
        <LoginForm inviteToken={inviteToken} />
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground md:text-left">
          Neu bei RefStack?{' '}
          <Link
            href={registerHref ?? ROUTES.register}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Konto erstellen
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
