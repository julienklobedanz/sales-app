'use client'

import { Tag01Icon } from '@hugeicons/core-free-icons'

import { Card, CardContent } from '@/components/ui/card'
import { AppIcon } from '@/lib/icons'

import type { ReferenceRow } from '../../actions'

export function ReferenceDetailStoryCard({
  selectedRef,
  normalizeTagLabel,
}: {
  selectedRef: ReferenceRow
  normalizeTagLabel: (raw: string) => string
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        {selectedRef.customer_challenge || selectedRef.our_solution ? (
          <div className="space-y-7">
            {selectedRef.customer_challenge ? (
              <div className="space-y-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Herausforderung des Kunden
                </span>
                <p className="text-foreground text-sm leading-relaxed">
                  {selectedRef.customer_challenge}
                </p>
              </div>
            ) : null}
            {selectedRef.our_solution ? (
              <div className="space-y-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Unsere Lösung
                </span>
                <p className="text-foreground text-sm leading-relaxed">
                  {selectedRef.our_solution}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <AppIcon icon={Tag01Icon} size={12} /> Tags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedRef.tags ? (
              selectedRef.tags
                .split(/[\s,]+/)
                .map((tag) => normalizeTagLabel(tag))
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {tag}
                  </span>
                ))
            ) : (
              <span className="text-xs font-medium text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
