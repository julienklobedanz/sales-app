import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { submitForApproval, toggleFavorite } from '@/app/dashboard/actions'
import { Loader2, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const s = String(status ?? '').toLowerCase()
  if (s === 'approved' || s === 'external')
    return <Badge className="bg-emerald-600">Extern freigegeben</Badge>
  if (s === 'internal_only' || s === 'internal')
    return <Badge variant="secondary">Intern</Badge>
  if (s === 'anonymized' || s === 'anonymous')
    return <Badge variant="outline">Anonymisiert</Badge>
  if (s === 'pending')
    return <Badge className="bg-amber-500 text-white">Freigabe ausstehend</Badge>
  return <Badge variant="outline">Entwurf</Badge>
}

function splitTags(tags: string | null) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const role = (profile as { role?: 'admin' | 'sales' | 'account_manager' }).role ?? 'sales'

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      industry,
      country,
      status,
      tags,
      created_at,
      updated_at,
      embedding_updated_at,
      embedding_error,
      customer_challenge,
      our_solution,
      volume_eur,
      contract_type,
      project_start,
      project_end,
      incumbent_provider,
      competitors,
      website,
      companies ( id, name )
    `
    )
    .eq('id', id)
    .single()

  if (error || !row) notFound()

  const normalizedStatus = String((row as any).status ?? '').toLowerCase()
  if (
    role === 'sales' &&
    !(
      normalizedStatus === 'approved' ||
      normalizedStatus === 'internal_only' ||
      normalizedStatus === 'external' ||
      normalizedStatus === 'internal'
    )
  ) {
    notFound()
  }

  const { data: favorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('reference_id', id)
    .maybeSingle()

  const isFavorited = Boolean(favorite?.id)
  const tags = splitTags((row as any).tags ?? null)
  const company = Array.isArray((row as any).companies) ? (row as any).companies[0] : (row as any).companies

  const createdAt = (row as any).created_at ? new Date((row as any).created_at as string) : null
  const updatedAt = (row as any).updated_at ? new Date((row as any).updated_at as string) : null
  const embeddingUpdatedAtRaw = (row as any).embedding_updated_at as string | null | undefined
  const embeddingUpdatedAt = embeddingUpdatedAtRaw ? new Date(embeddingUpdatedAtRaw) : null
  const embeddingError = ((row as any).embedding_error as string | null | undefined) ?? null
  const activities = [
    ...(createdAt
      ? [
          {
            at: createdAt,
            title: 'Referenz erstellt',
            detail: 'Die Referenz wurde im Evidence Hub angelegt.',
          },
        ]
      : []),
    ...(updatedAt && createdAt && updatedAt.getTime() !== createdAt.getTime()
      ? [
          {
            at: updatedAt,
            title: 'Referenz bearbeitet',
            detail: 'Inhalte oder Metadaten wurden aktualisiert.',
          },
        ]
      : []),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10)

  return (
    <div className="px-6 pt-6 md:px-12 lg:px-20 pb-10">
      <div className="mb-6">
        <nav className="text-sm text-muted-foreground">
          <Link href="/dashboard/evidence" className="hover:underline">
            Evidence Hub
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{(row as any).title}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={(row as any).status} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight break-words">
                {(row as any).title}
              </h1>
              <p className="text-sm text-muted-foreground">{(row as any).industry ?? '—'}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.length ? (
                  tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">Herausforderung</div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {(row as any).customer_challenge ?? '—'}
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold">Unsere Lösung</div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {(row as any).our_solution ?? '—'}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.length ? (
                <ol className="relative ml-2 border-l pl-6">
                  {activities.map((a) => (
                    <li key={`${a.title}-${a.at.toISOString()}`} className="pb-4 last:pb-0">
                      <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-muted ring-4 ring-background" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.at.toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{a.detail}</div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projektdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium truncate max-w-[220px]">{company?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Volumen</span>
                <span className="font-medium">{(row as any).volume_eur ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Vertragsart</span>
                <span className="font-medium">{(row as any).contract_type ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektstart</span>
                <span className="font-medium">{(row as any).project_start ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektende</span>
                <span className="font-medium">{(row as any).project_end ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Akt. Dienstleister</span>
                <span className="font-medium">{(row as any).incumbent_provider ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Wettbewerber</span>
                <span className="font-medium">{(row as any).competitors ?? '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Embedding</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {embeddingError ? (
                <div className="space-y-2">
                  <Badge variant="destructive">Fehlgeschlagen</Badge>
                  <div className="text-xs text-muted-foreground break-words">
                    {embeddingError}
                  </div>
                </div>
              ) : embeddingUpdatedAt ? (
                <div className="space-y-2">
                  <Badge variant="secondary">Aktuell</Badge>
                  <div className="text-xs text-muted-foreground">
                    Stand:{' '}
                    {embeddingUpdatedAt.toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Wird erzeugt…</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nutzung & Impact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Views</div>
                <div className="font-semibold">—</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Shares</div>
                <div className="font-semibold">—</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">In Deals</div>
                <div className="font-semibold">—</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Won/Lost</div>
                <div className="font-semibold">—</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <form action={toggleFavorite.bind(null, id)}>
                <Button type="submit" variant="outline" className="gap-2 w-full">
                  <Star className="size-4" fill={isFavorited ? 'currentColor' : 'none'} />
                  {isFavorited ? 'Favorit' : 'Favorisieren'}
                </Button>
              </form>
              <Button variant="outline" disabled>
                PDF exportieren
              </Button>
              <Button variant="outline" disabled>
                Link erstellen
              </Button>
              {role === 'sales' ? null : (
                <>
                  <Button variant="outline" disabled>
                    Anonymisierte Version
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/evidence/${id}/edit`}>Bearbeiten</Link>
                  </Button>
                  <form action={submitForApproval.bind(null, id)}>
                    <Button type="submit" variant="outline">
                      Freigabe anfordern
                    </Button>
                  </form>
                  <Button variant="destructive" disabled>
                    Löschen
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

