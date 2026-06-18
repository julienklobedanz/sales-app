import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from './login-form'
import { AUTH_BRAND_CONTENT } from '@/lib/auth/brand-content'
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
    : ROUTES.register

  return (
    <AuthShell brandContent={AUTH_BRAND_CONTENT.login}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Bei Ihrem Konto anmelden
          </h1>
          {inviteToken ? (
            <p className="text-sm text-gray-500">
              Melde dich an, um der Einladung beizutreten.
            </p>
          ) : null}
        </div>
        <LoginForm inviteToken={inviteToken} />
        <p className="text-sm text-gray-500">
          Neu bei RefStack?{' '}
          <Link
            href={registerHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Konto erstellen
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
