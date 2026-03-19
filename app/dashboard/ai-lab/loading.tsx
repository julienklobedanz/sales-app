import { Skeleton } from '@/components/ui/skeleton'

export default function AiLabLoading() {
  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="mt-2 h-4 w-[70%] rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="rounded-xl border p-6 h-[200px]" />
        ))}
      </div>
    </div>
  )
}
