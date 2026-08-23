import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DealRfpCockpitSkeleton() {
  return (
    <Card id="ausschreibung" className="mb-6">
      <CardContent className="space-y-4 py-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}
