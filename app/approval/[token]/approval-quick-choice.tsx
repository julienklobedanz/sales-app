'use client'

import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  QUICK_APPROVAL_CARDS,
  type QuickApprovalChoice,
} from '@/lib/references/quick-approval-choice'

export function ApprovalQuickChoice({
  value,
  disabled,
  onChange,
}: {
  value: QuickApprovalChoice
  disabled?: boolean
  onChange: (choice: QuickApprovalChoice) => void
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Wofür dürfen wir Ihre Referenz nutzen?</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Eine Auswahl — in weniger als einer Minute erledigt.
        </p>
      </div>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Freigabe-Typ">
        {QUICK_APPROVAL_CARDS.map((card) => {
          const active = value === card.id
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(card.id)}
              className={cn(
                'relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
                active
                  ? 'border-primary bg-blue-50/50 shadow-sm'
                  : 'border-border bg-background hover:border-primary/30 hover:bg-muted/20'
              )}
            >
              <span
                className={cn(
                  'absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full border-2',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 bg-background'
                )}
                aria-hidden
              >
                {active ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <p className="pr-8 text-sm font-semibold text-foreground">{card.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
