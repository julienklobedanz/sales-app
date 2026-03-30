import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = (params.tab ?? 'smart').toLowerCase()
  const isRfp = tab === 'rfp'

  return (
    <div className="px-6 pt-6 md:px-12 lg:px-20">
      <h1 className="text-2xl font-bold tracking-tight">Match</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Diese Seite wird in <strong>E4</strong> (Match Engine) umgesetzt.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant={isRfp ? 'outline' : 'default'}>
          <Link href="/dashboard/match">Smart Search</Link>
        </Button>
        <Button asChild variant={isRfp ? 'default' : 'outline'}>
          <Link href="/dashboard/match?tab=rfp">RFP-Analyse</Link>
        </Button>
      </div>
    </div>
  )
}

