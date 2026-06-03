'use client'

import { useState } from 'react'
import { Check, Circle, CircleCheck } from 'lucide-react'

import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'
import { cn } from '@/lib/utils'

export type BidNextStep = {
  id: string
  title: string
  detail?: string
  onActivate?: () => void
}

type Props = {
  steps: BidNextStep[]
  className?: string
  defaultOpen?: boolean
}

export function BidNextStepsCard({ steps, className, defaultOpen = true }: Props) {
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set())

  function toggleDone(id: string) {
    setDoneIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <BidOverviewCollapsibleCard
      defaultOpen={defaultOpen}
      className={className}
      contentClassName="pt-2 pb-6"
      title={
        <span className="text-base font-semibold text-foreground">Nächste Schritte (max. 5)</span>
      }
      description={
        <span>Aus den Red Flags, Lücken und SME-Aufgaben abgeleitet.</span>
      }
    >
      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine offenen To-dos gefunden. (Wenn Inhalte fehlen, prüfe Red Flags / Entwürfe.)
        </p>
      ) : (
        <div className="space-y-2">
          {steps.map((s) => {
            const done = doneIds.has(s.id)
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3.5 transition-colors duration-200',
                  done ? 'bg-muted/20' : 'bg-muted/30 hover:bg-muted/40'
                )}
                onClick={() => {
                  if (!done && s.onActivate) s.onActivate()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (!done && s.onActivate) s.onActivate()
                  }
                }}
              >
                <button
                  type="button"
                  className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDone(s.id)
                  }}
                >
                  {done ? (
                    <CircleCheck className="size-5 text-emerald-600" aria-hidden />
                  ) : (
                    <>
                      <Circle
                        className="size-5 text-muted-foreground/80 transition-opacity group-hover:opacity-0"
                        aria-hidden
                      />
                      <Check
                        className="pointer-events-none absolute inset-0 m-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-40"
                        aria-hidden
                      />
                    </>
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      done ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}
                  >
                    {s.title}
                  </p>
                  {s.detail ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.detail}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </BidOverviewCollapsibleCard>
  )
}
