'use client'

import { cn } from '@/lib/utils'

type Props = {
  onMouseDown: (event: React.MouseEvent | React.TouchEvent) => void
  onTouchStart?: (event: React.TouchEvent) => void
  className?: string
  /** Sichtbarer Hinweis während Resize (z. B. TanStack isResizing). */
  isResizing?: boolean
}

/**
 * Schmaler Griff am rechten Spaltenrand — nur Resize, kein Spalten-Reorder.
 * Visuelle Trenner kommen vom Spaltenkopf (Primary bei Hover); hier nur Hit-Area.
 */
export function ColumnResizeHandle({
  onMouseDown,
  onTouchStart,
  className,
  isResizing = false,
}: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Spaltenbreite ändern"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart ?? onMouseDown}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute right-0 top-0 z-20 h-full w-2 cursor-col-resize touch-none select-none',
        isResizing &&
          'after:pointer-events-none after:absolute after:inset-y-3 after:right-0 after:w-[1.5px] after:rounded-full after:bg-primary',
        className,
      )}
    />
  )
}
