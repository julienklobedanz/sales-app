import type { Metadata } from 'next'
import { getPublicPortfolio, getPublicPortfolioBranding, incrementPortfolioViews } from '../actions'
import { PublicPortfolioKillswitch } from './killswitch'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getPublicPortfolio(slug)
  const branding = await getPublicPortfolioBranding(slug)

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
        <header className="border-b bg-background/95 px-6 py-6 sm:px-12 lg:px-24">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div>
              <div
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: branding.secondary_color }}
              >
                RefStack Portfolio
              </div>
              <h1
                className="mt-1 text-xl font-semibold tracking-tight"
                style={{ color: branding.primary_color }}
              >
                {branding.name}
              </h1>
            </div>
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={`${branding.name} Logo`}
                className="h-10 w-auto object-contain"
              />
            ) : null}
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-4xl px-6 py-24 sm:px-12 lg:px-24">
        <div className="grid gap-4 md:grid-cols-2">
          {result.references.map((ref) => (
            <article key={ref.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                {ref.company_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ref.company_logo_url}
                    alt={`${ref.company_name} Logo`}
                    className="h-8 w-8 rounded-sm object-contain"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{ref.company_name}</p>
                  <h2 className="truncate text-sm font-semibold">{ref.title}</h2>
                </div>
              </div>

              <p className="line-clamp-3 text-sm text-muted-foreground">
                {ref.summary || ref.customer_challenge || 'Keine Beschreibung verfügbar.'}
              </p>

              <details className="mt-3 rounded-md border bg-muted/30 p-3">
                <summary className="cursor-pointer text-sm font-medium">Details anzeigen</summary>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Branche</span>
                    <span>{ref.industry || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Volumen</span>
                    <span>{ref.volume_eur || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Projektstatus</span>
                    <span>{ref.project_status || '—'}</span>
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    <p className="font-medium">Herausforderung</p>
                    <p>{ref.customer_challenge || '—'}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium">Lösung</p>
                    <p>{ref.our_solution || '—'}</p>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </main>
      <footer className="border-t bg-muted/30 px-6 py-8 sm:px-12 lg:px-24">
        <PublicPortfolioKillswitch slug={slug} />
      </footer>
    </div>
  )
}
