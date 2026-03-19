import { Skeleton } from '@/components/ui/skeleton'

export default function AiLabLoading() {
  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="mt-2 h-4 w-[70%] rounded-md" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}
