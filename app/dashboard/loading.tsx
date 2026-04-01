import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="space-y-2 rounded-xl border bg-card/60 p-3">
          <Skeleton className="h-6 w-full rounded-md" />
          <Skeleton className="h-6 w-full rounded-md" />
          <Skeleton className="h-6 w-[80%] rounded-md" />
        </div>
        <div className="space-y-2 rounded-xl border bg-card/60 p-3">
          <Skeleton className="h-6 w-full rounded-md" />
          <Skeleton className="h-6 w-full rounded-md" />
          <Skeleton className="h-6 w-[60%] rounded-md" />
        </div>
      </div>
    </div>
  )
}

