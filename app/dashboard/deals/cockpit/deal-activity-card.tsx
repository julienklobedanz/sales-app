'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'

export type DealActivityItem = {
  id: string
  at: Date
  title: string
  detail: string
}

export function DealActivityCard({ activities = [] }: { activities?: DealActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{COPY.deals.cockpit.activityTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length ? (
          <ol className="relative ml-2 border-l pl-6">
            {activities.map((a) => (
              <li key={a.id} className="pb-4 last:pb-0">
                <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-muted ring-4 ring-background" />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {a.at.toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {a.detail ? (
                  <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.detail}</div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
        )}
      </CardContent>
    </Card>
  )
}
