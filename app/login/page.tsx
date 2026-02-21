import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from './login-form'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const inviteToken = params.invite?.trim() || null
  const registerHref = inviteToken ? `/register?invite=${encodeURIComponent(inviteToken)}` : undefined

  return (
    <AuthShell
      topRightLink={{ href: '/register', label: 'Registrieren' }}
      topRightLinkSearch={inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : undefined}
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Anmelden</h1>
          <p className="text-sm text-muted-foreground">
            {inviteToken
              ? 'Melde dich an, um der Einladung beizutreten.'
              : 'Gib deine Zugangsdaten ein, um dich anzumelden.'}
          </p>
        </div>
        <LoginForm inviteToken={inviteToken} />
        <p className="text-center text-sm text-muted-foreground md:text-left">
          Noch kein Konto?{' '}
          <Link
            href={registerHref ?? '/register'}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
