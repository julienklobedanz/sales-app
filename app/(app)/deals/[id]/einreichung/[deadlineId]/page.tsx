import { Suspense } from 'react'

import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'

import { DealSubmissionPageContent } from '../page'

export const dynamic = 'force-dynamic'

export default function DealSubmissionDeadlinePage({
  params,
}: {
  params: Promise<{ id: string; deadlineId: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealSubmissionDeadline params={params} />
    </Suspense>
  )
}

async function DealSubmissionDeadline({
  params,
}: {
  params: Promise<{ id: string; deadlineId: string }>
}) {
  const resolved = await params
  return (
    <DealSubmissionPageContent
      params={Promise.resolve({ id: resolved.id })}
      deadlineId={resolved.deadlineId}
    />
  )
}
