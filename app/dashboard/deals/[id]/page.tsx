import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import { getDealWithReferences, getReferencesForOrg } from '../actions'
import { DealDetailClient } from './deal-detail-client'

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [deal, allReferences] = await Promise.all([getDealWithReferences(id), getReferencesForOrg()])
  if (!deal) notFound()

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/dashboard/deals">
          <Button variant="ghost" size="sm" className="-ml-2 gap-2">
            <ArrowLeftIcon className="size-4" />
            Zurück zu Deals
          </Button>
        </Link>
        <DealDetailClient deal={deal} allReferences={allReferences} />
      </div>
    </div>
  )
}
