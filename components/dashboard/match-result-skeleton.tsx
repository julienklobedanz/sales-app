import { Card, CardContent } from '@/components/ui/card'

export function MatchResultSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Suche läuft">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="animate-pulse border-muted/60">
          <CardContent className="space-y-3 p-4">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted/80" />
            <div className="h-3 w-5/6 rounded bg-muted/70" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-16 rounded-full bg-muted/60" />
              <div className="h-6 w-24 rounded-full bg-muted/50" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function CommandCenterResultsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Suche läuft">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-0 p-0">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-50" />
            </div>
          ))}
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
