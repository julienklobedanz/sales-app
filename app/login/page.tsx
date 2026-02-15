import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MagicLinkForm } from './magic-link-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/80">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Anmelden
          </CardTitle>
          <CardDescription>
            Gib deine E-Mail ein – wir schicken dir einen Magic Link zum Einloggen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MagicLinkForm />
        </CardContent>
      </Card>
    </div>
  )
}
