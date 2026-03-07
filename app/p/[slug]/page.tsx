import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicPortfolio, incrementPortfolioViews } from '../actions'
import { ReferenceReader } from '@/app/dashboard/reference-reader'
import type { ReferenceRow } from '@/app/dashboard/actions'
import type { PublicReference } from '../actions'
import { PublicPortfolioKillswitch } from './killswitch'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
}

function toReferenceRow(r: PublicReference): ReferenceRow {
  return {
    ...r,
    status: (r.status as ReferenceRow['status']) || 'approved',
    project_status: (r.project_status as ReferenceRow['project_status']) ?? null,
    created_at: '',
    updated_at: null,
    company_id: '',
    contact_id: null,
    contact_email: null,
    contact_display: null,
    customer_contact: null,
    file_path: null,
    is_favorited: false,
  }
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const result = await getPublicPortfolio(slug)

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
      <main className="mx-auto max-w-4xl px-6 py-24 sm:px-12 lg:px-24">
        <div className="space-y-16">
          {result.references.map((ref) => (
            <ReferenceReader key={ref.id} ref={toReferenceRow(ref)} />
          ))}
        </div>
      </main>
      <footer className="border-t bg-muted/30 px-6 py-8 sm:px-12 lg:px-24">
        <PublicPortfolioKillswitch slug={slug} />
      </footer>
    </div>
  )
}
