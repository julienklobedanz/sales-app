'use client'

import { CheckIcon } from '@/components/ui/check-icon'
import { cn } from '@/lib/utils'

/** Eine Zeile wie `DropdownMenuCheckboxItem`: Haken links, Label rechts (für Popover-Filter). */
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
        'relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-left text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        {selected ? <CheckIcon className="size-3.5" /> : null}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
