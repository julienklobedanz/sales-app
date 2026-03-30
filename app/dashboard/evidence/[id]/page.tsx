import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function EvidenceDetailPlaceholderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referenz</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Die Referenz-Detailseite wird in <strong>E2</strong> (Evidence Hub) umgesetzt.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link href={`/dashboard/evidence/${id}/edit`}>Bearbeiten</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/evidence">Zurück zum Evidence Hub</Link>
        </Button>
      </div>
    </div>
  )
}

