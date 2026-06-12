'use client'

import { X, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type TableBulkActionItem = {
  id: string
  label: string
  icon?: LucideIcon
  onClick: () => void | Promise<void>
  disabled?: boolean
  variant?: 'default' | 'destructive'
  hidden?: boolean
}

type Props = {
  selectedCount: number
  onClearSelection: () => void
  actions: TableBulkActionItem[]
  className?: string
}

const actionButtonClass = {
  default:
    'text-sm flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 rounded-xl text-gray-700 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  destructive:
    'text-sm flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
}

export function TableBulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: Props) {
  if (selectedCount <= 0) return null

  const visibleActions = actions.filter((action) => !action.hidden)

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2',
        className
      )}
      role="region"
      aria-label="Bulk-Aktionen"
    >
      <div className="flex min-w-[min(450px,100%)] items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-lg">
        <p className="px-2 text-sm font-medium text-gray-600">{selectedCount} ausgewählt</p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {visibleActions.map((action) => {
            const Icon = action.icon
            const variant = action.variant ?? 'default'
            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => void action.onClick()}
                className={actionButtonClass[variant]}
              >
                {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
                {action.label}
              </button>
            )
          })}

          <div className="mx-1 h-4 w-px bg-gray-200" aria-hidden />

          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-xl px-2 py-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Auswahl aufheben"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
