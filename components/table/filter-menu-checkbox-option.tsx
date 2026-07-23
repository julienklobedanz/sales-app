'use client'

import { CheckIcon } from '@/components/ui/check-icon'
import { cn } from '@/lib/utils'

/** Smart-Match-Stil: Label links, Haken rechts — beides primary wenn ausgewählt. */
export function FilterMenuCheckboxOption({
  label,
  selected,
  onSelect,
  className,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full cursor-default items-center justify-between rounded-md px-2 py-1.5 text-left text-sm outline-none select-none hover:bg-accent',
        selected ? 'font-medium text-primary' : 'text-foreground',
        className
      )}
    >
      <span className="min-w-0 truncate pr-2">{label}</span>
      {selected ? <CheckIcon className="size-3.5 shrink-0 text-primary" /> : null}
    </button>
  )
}
