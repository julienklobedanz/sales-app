import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './login-form'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const inviteToken = params.invite?.trim() || null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/80">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Anmelden
          </CardTitle>
          <CardDescription>
            {inviteToken ? 'Melde dich an, um der Einladung beizutreten.' : 'Mit E-Mail und Passwort anmelden.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm inviteToken={inviteToken} />
          <p className="text-center text-sm text-muted-foreground">
            Noch kein Konto?{' '}
            <Link href={inviteToken ? `/register?invite=${encodeURIComponent(inviteToken)}` : '/register'} className="font-medium text-primary underline-offset-4 hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
