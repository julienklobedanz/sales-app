import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <Skeleton className="h-8 w-44 rounded-md" />
        <Skeleton className="mt-2 h-4 w-[60%] rounded-md" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="rounded-3xl border bg-card/60 p-6 space-y-3">
              <Skeleton className="h-5 w-[45%] rounded-md" />
              <Skeleton className="h-4 w-[80%] rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

