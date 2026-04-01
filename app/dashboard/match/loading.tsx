import { Skeleton } from '@/components/ui/skeleton'

export default function MatchLoading() {
  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="mt-2 h-4 w-[55%] rounded-md" />
      </div>

      <div className="space-y-3 rounded-xl border bg-card/60 p-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 flex-1 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

