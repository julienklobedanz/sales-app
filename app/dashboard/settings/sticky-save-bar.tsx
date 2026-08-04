'use client'

import { Save } from 'lucide-react'
import { BRAND_PRIMARY_BUTTON_CLASS } from '@/lib/cognism-shell-styles'
import { cn } from '@/lib/utils'

export function StickySaveBar({
  visible,
  pending,
  onSave,
  label = 'Änderungen speichern',
}: {
  visible: boolean
  pending?: boolean
  onSave: () => void
  label?: string
}) {
  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2"
      role="region"
      aria-label="Ungespeicherte Änderungen"
    >
      <div className="flex min-w-[min(450px,100%)] items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-lg">
        <p className="px-2 text-sm font-medium text-gray-600">
          Ungespeicherte Änderungen
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onSave}
            className={cn(
              BRAND_PRIMARY_BUTTON_CLASS,
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <Save className="size-4 shrink-0" aria-hidden />
            {pending ? 'Speichert …' : label}
          </button>
        </div>
      </div>
    </div>
  )
}
