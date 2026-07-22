'use client'

import { forwardRef } from 'react'
import type { CheckedState } from '@radix-ui/react-checkbox'

import { Checkbox } from '@/components/ui/checkbox'

type Props = {
  checked: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  /** Legacy-Toggle ohne expliziten Wert (z. B. Warenkorb). */
  onChange?: () => void
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  'aria-label': string
  disabled?: boolean
  /** Höhe des Wrappers — `10` für Tabellenkopf, `9` für Datenzeilen. */
  rowHeight?: 9 | 10
}

export const TableRowCheckbox = forwardRef<HTMLButtonElement, Props>(function TableRowCheckbox(
  {
    checked,
    onCheckedChange,
    onChange,
    onClick,
    'aria-label': ariaLabel,
    disabled = false,
    rowHeight = 9,
  },
  ref,
) {
  const heightClass = rowHeight === 10 ? 'h-10' : 'min-h-9'
  const resolvedChecked: CheckedState = checked === 'indeterminate' ? 'indeterminate' : checked

  return (
    <div className={`flex ${heightClass} w-full items-center justify-center`}>
      <Checkbox
        ref={ref}
        checked={resolvedChecked}
        onCheckedChange={(value) => {
          if (value === 'indeterminate') return
          if (onCheckedChange) {
            onCheckedChange(value)
            return
          }
          onChange?.()
        }}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    </div>
  )
})
