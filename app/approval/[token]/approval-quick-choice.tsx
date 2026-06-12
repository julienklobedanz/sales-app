'use client'

import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  QUICK_APPROVAL_CARDS,
  type QuickApprovalCardTone,
  type QuickApprovalChoice,
  type QuickApprovalChoiceValue,
} from '@/lib/references/quick-approval-choice'

const TONE_STYLES: Record<
  QuickApprovalCardTone,
  { idle: string; active: string; radio: string }
> = {
  positive: {
    idle: 'border-border/80 bg-emerald-50/35 hover:border-emerald-200/70 hover:bg-emerald-50/55',
    active: 'border-emerald-300/70 bg-emerald-50/60 shadow-sm',
    radio: 'border-emerald-600 bg-emerald-600 text-white',
  },
  warning: {
    idle: 'border-border/80 bg-amber-50/35 hover:border-amber-200/70 hover:bg-amber-50/55',
    active: 'border-amber-300/70 bg-amber-50/60 shadow-sm',
    radio: 'border-amber-600 bg-amber-600 text-white',
  },
  negative: {
    idle: 'border-border/80 bg-red-50/30 hover:border-red-200/70 hover:bg-red-50/50',
    active: 'border-red-300/70 bg-red-50/55 shadow-sm',
    radio: 'border-red-600 bg-red-600 text-white',
  },
}

export function ApprovalQuickChoice({
  value,
  disabled,
  onChange,
}: {
  value: QuickApprovalChoiceValue
  disabled?: boolean
  onChange: (choice: QuickApprovalChoiceValue) => void
}) {
  function handleToggle(cardId: QuickApprovalChoice) {
    onChange(value === cardId ? null : cardId)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">Wofür dürfen wir Ihre Referenz nutzen?</p>
      <div className="flex flex-col gap-2" role="group" aria-label="Freigabe-Typ">
        {QUICK_APPROVAL_CARDS.map((card) => {
          const active = value === card.id
          const tone = TONE_STYLES[card.tone]
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => handleToggle(card.id)}
              className={cn(
                'relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
                active ? tone.active : tone.idle
              )}
            >
              <span
                className={cn(
                  'absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full border-2',
                  active
                    ? tone.radio
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
