import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircleIcon, HandshakeIcon, TimerIcon } from 'lucide-react'

export default async function DealsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <div className="flex flex-col gap-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Deals</h2>
        <p className="text-muted-foreground mt-1">
          Aktuelle Deals und auslaufende Referenzprojekte – hier können Bedarfe eingestellt und
          Informationen zu bald auslaufenden Referenzen abgerufen werden.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HandshakeIcon className="size-5 text-muted-foreground" />
              <CardTitle>Aktuelle Deals</CardTitle>
            </div>
            <CardDescription>
              Übersicht der laufenden Deals und eingestellten Bedarfe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
              <p className="text-sm">Dieser Bereich wird in Kürze mit Inhalten gefüllt.</p>
              <p className="mt-2 text-xs">
                Hier erscheinen Deals, in denen Nutzer ihren Bedarf eingestellt haben.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TimerIcon className="size-5 text-muted-foreground" />
              <CardTitle>Auslaufende Referenzen (Expiring)</CardTitle>
            </div>
            <CardDescription>
              Referenzprojekte, die bald auslaufen – rechtzeitig informiert bleiben.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-muted-foreground">
              <AlertCircleIcon className="mx-auto size-8 opacity-50" />
              <p className="mt-2 text-sm">Expiring-Deals werden hier angezeigt.</p>
              <p className="mt-1 text-xs">
                Sobald Referenzen mit Ablaufdatum gepflegt werden, erscheinen sie hier.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
