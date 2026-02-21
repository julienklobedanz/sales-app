import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RegisterForm } from './register-form'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function RegisterPage({ searchParams }: Props) {
  const params = await searchParams
  const inviteToken = params.invite?.trim() || null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/80">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Registrieren
          </CardTitle>
          <CardDescription>
            {inviteToken
              ? 'Du wurdest eingeladen. Erstelle dein Konto, um dem Team beizutreten.'
              : 'Erstelle ein Konto mit E-Mail und Passwort.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm inviteToken={inviteToken} />
          <p className="text-center text-sm text-muted-foreground">
            Bereits ein Konto?{' '}
            <Link href={inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : '/login'} className="font-medium text-primary underline-offset-4 hover:underline">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
