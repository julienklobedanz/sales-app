'use client'

import { forwardRef } from 'react'

type Props = {
  checked: boolean
  onChange: () => void
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void
  'aria-label': string
  disabled?: boolean
  /** Höhe des Wrappers — `9` für Datenzeilen (Logo), `10` für Tabellenkopf. */
  rowHeight?: 9 | 10
}

export const TableRowCheckbox = forwardRef<HTMLInputElement, Props>(function TableRowCheckbox(
  {
    checked,
    onChange,
    onClick,
    'aria-label': ariaLabel,
    disabled = false,
    rowHeight = 9,
  },
  ref
) {
  const heightClass = rowHeight === 10 ? 'h-10' : 'h-9'

  return (
    <div className={`flex ${heightClass} items-center justify-center`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className="size-4 shrink-0 rounded border-muted-foreground/50"
      />
    </div>
  )
})
