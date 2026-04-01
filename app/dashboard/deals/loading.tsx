import { Skeleton } from '@/components/ui/skeleton'

export default function DealsLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="mt-2 h-4 w-72 rounded-md" />
      </div>
      <div className="space-y-3 rounded-xl border bg-card/60 p-4">
        <Skeleton className="h-9 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 flex-1 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

