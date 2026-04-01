import { Skeleton } from '@/components/ui/skeleton'

export default function RequestsLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="space-y-3 rounded-xl border bg-card/60 p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 flex-1 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

