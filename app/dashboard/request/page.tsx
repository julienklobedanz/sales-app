import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RequestReferencePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Referenz anfragen</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Neue Referenz anfragen</CardTitle>
          <CardDescription>
            Als Sales Rep können Sie hier eine Referenzanfrage stellen. Ein
            Marketing-Mitarbeiter oder Account Owner wird sich bei Ihnen melden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Kontaktieren Sie Ihr Team per E-Mail oder Slack, um eine neue
            Referenz anzulegen. Hier kann später ein Kontaktformular oder
            Integration (z. B. Slack) eingebunden werden.
          </p>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
