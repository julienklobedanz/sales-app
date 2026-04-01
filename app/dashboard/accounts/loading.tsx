import { Skeleton } from '@/components/ui/skeleton'

export default function CompaniesLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="mt-2 h-4 w-[60%] rounded-md" />
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-11 w-full max-w-md rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-3xl border bg-card/60 p-4"
            >
              <Skeleton className="h-6 w-[70%] rounded-md" />
              <Skeleton className="h-4 w-[50%] rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-[80%] rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

