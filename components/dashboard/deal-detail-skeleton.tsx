import { Skeleton } from '@/components/ui/skeleton'

export function DealDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-9 w-[min(100%,28rem)] rounded-md" />
        <Skeleton className="h-4 w-48 rounded-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <div className="min-h-[480px] rounded-xl border bg-card/60 p-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
