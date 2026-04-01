import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitTicket } from '../actions'
import { TicketStatusBadge } from '@/components/ticket-status-badge'
import { TicketTypeSelect } from './ticket-type-select'
import { ROUTES } from '@/lib/routes'

export default async function RequestReferencePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorParam = params.error?.trim() ? decodeURIComponent(params.error) : null

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, subject, message, status, created_at')
    .order('created_at', { ascending: false })

  async function createTicket(formData: FormData) {
    'use server'
    const type = (formData.get('type')?.toString() as 'support' | 'feedback') ?? 'support'
    const subject = formData.get('subject')?.toString() ?? ''
    const message = formData.get('message')?.toString() ?? ''
    const result = await submitTicket(type, subject, message)
    if (!result.success) {
      // Fehler im Redirect-URL encoden
      redirect(`${ROUTES.request}?error=${encodeURIComponent(result.error)}`)
    }
    redirect(ROUTES.request)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referenz anfragen</h1>
          <p className="text-sm text-muted-foreground">
            Melde hier deinen Bedarf – Marketing/Account Owner erhalten ein Ticket.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.home}>Zurück zur Übersicht</Link>
        </Button>
      </div>

      {errorParam ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle>Die Anfrage konnte nicht gespeichert werden</CardTitle>
            <CardDescription className="text-destructive">
              {errorParam}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Neue Referenzanfrage erstellen</CardTitle>
            <CardDescription>
              Beschreibe kurz Deal, Kunde und wofür du eine Referenz brauchst.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTicket} className="space-y-4">
              <TicketTypeSelect />
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="subject">
                  Betreff
                </label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="z. B. Referenz für Cloud-Projekt bei ACME gesucht"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="message">
                  Beschreibung
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Kurze Beschreibung des Deals, des Kunden und welche Art von Referenz du brauchst."
                />
              </div>
              <Button type="submit">Anfrage absenden</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:h-full">
          <CardHeader>
            <CardTitle>Deine bisherigen Anfragen</CardTitle>
            <CardDescription>
              Offene und abgeschlossene Tickets in der Ticket-Pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!tickets || tickets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4">
                <div className="text-sm font-medium">Noch keine Anfragen</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sobald du eine Anfrage absendest, erscheint sie hier.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border bg-muted/40 px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{t.subject}</span>
                      <TicketStatusBadge status={t.status} />
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {t.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleString('de-DE')
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
