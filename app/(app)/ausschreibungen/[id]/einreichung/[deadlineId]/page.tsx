import { Suspense } from 'react'

import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'

import { TenderSubmissionPageContent } from '../page'

export const dynamic = 'force-dynamic'

export default function TenderSubmissionDeadlinePage({
  params,
}: {
  params: Promise<{ id: string; deadlineId: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <TenderSubmissionDeadline params={params} />
    </Suspense>
  )
}

async function TenderSubmissionDeadline({
  params,
}: {
  params: Promise<{ id: string; deadlineId: string }>
}) {
  const resolved = await params
  return (
    <TenderSubmissionPageContent
      params={Promise.resolve({ id: resolved.id })}
      deadlineId={resolved.deadlineId}
    />
  )
}
