'use client'

import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <p className="text-sm text-muted-foreground">Ungespeicherte Änderungen</p>
        <Button type="button" size="sm" onClick={onSave} disabled={pending}>
          <Save className="mr-2 h-4 w-4" />
          {pending ? 'Speichert …' : label}
        </Button>
      </div>
    </div>
  )
}

