import type { Metadata } from 'next'
import { getPublicPortfolio, getPublicPortfolioBranding, incrementPortfolioViews } from '../actions'
import { PublicPortfolioKillswitch } from './killswitch'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
}

function formatDateMaybe(value: string | null) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  const d = new Date(v.includes('T') ? v : `${v}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return v
  return formatDateUtcDe(d.toISOString())
}

function splitTags(tags: string | null) {
  return String(tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getPublicPortfolio(slug)
  const branding = await getPublicPortfolioBranding(slug)
  const workspaceName = branding.found ? branding.name : 'RefStack Workspace'
  const singleReferenceTitle =
    result.found && result.references.length === 1 ? result.references[0]?.title ?? null : null
  const headerSubtitle = singleReferenceTitle
    ? `Projektdetails ${workspaceName} - ${singleReferenceTitle}`
    : `Projektdetails ${workspaceName}`

  if (!result.found) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="mx-auto max-w-md rounded-2xl border bg-card/80 p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Link nicht verfügbar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Link wurde deaktiviert oder existiert nicht.
          </p>
        </div>
      </div>
    )
  }

  await incrementPortfolioViews(slug)

  return (
    <div className="min-h-screen bg-muted/20">
      {branding.found ? (
        <header className="border-b bg-background/95 px-6 py-5 sm:px-12 lg:px-16">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <h1
                className="text-lg font-semibold tracking-tight"
                style={{ color: branding.primary_color }}
              >
                {`Referenzportfolio - ${workspaceName}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={`${branding.name} Logo`}
                className="h-9 w-auto object-contain"
              />
            ) : null}
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-12 lg:px-16">
        <div className="space-y-8">
          {result.references.map((ref) => (
            <article key={ref.id} className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Referenz</Badge>
                    </div>
                    <div className="flex items-start gap-3">
                      {ref.company_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ref.company_logo_url}
                          alt={`${ref.company_name} Logo`}
                          className="mt-0.5 h-10 w-10 rounded-md border bg-muted object-contain p-1"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{ref.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ref.company_name}
                          {ref.industry ? ` · ${ref.industry}` : ''}
                        </p>
                      </div>
                    </div>
                    {splitTags(ref.tags).length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {splitTags(ref.tags).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {ref.summary ? (
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">Zusammenfassung</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{ref.summary}</p>
                    </section>
                  ) : null}

                  {ref.customer_challenge ? (
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">Herausforderung</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {ref.customer_challenge}
                      </p>
                    </section>
                  ) : null}

                  {ref.our_solution ? (
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">Unsere Lösung</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {ref.our_solution}
                      </p>
                    </section>
                  ) : null}
                </div>

                <aside className="space-y-4 lg:sticky lg:top-8 lg:h-fit">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Projektdetails</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Account</span>
                        <span className="text-right font-medium">{ref.company_name || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Volumen</span>
                        <span className="text-right font-medium tabular-nums">
                          {formatReferenceVolume(ref.volume_eur) || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Vertragsart</span>
                        <span className="text-right font-medium">{ref.contract_type || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Projektstatus</span>
                        <span className="text-right font-medium">{ref.project_status || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Projektstart</span>
                        <span className="text-right font-medium">{formatDateMaybe(ref.project_start) || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Projektende</span>
                        <span className="text-right font-medium">{formatDateMaybe(ref.project_end) || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Website</span>
                        <span className="text-right font-medium">{ref.website || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Mitarbeiter</span>
                        <span className="text-right font-medium tabular-nums">
                          {ref.employee_count != null ? ref.employee_count.toLocaleString('de-DE') : '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Hinweis</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Diese Referenz wurde als Kundenansicht freigegeben. Weitere Kontaktdaten werden
                      nur angezeigt, wenn sie explizit freigegeben sind.
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </article>
          ))}
          {result.references.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
              Für diesen Link sind aktuell keine Referenzen sichtbar.
            </div>
          ) : null}
        </div>
      </main>
      <footer className="border-t bg-muted/30 px-6 py-8 sm:px-12 lg:px-24">
        <PublicPortfolioKillswitch slug={slug} />
      </footer>
    </div>
  )
}
