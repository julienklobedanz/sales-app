'use client'

import { useState } from 'react'
import { FileDownIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header)
  return m?.[1]?.trim() ?? null
}

export function PptxOnepagerExportButton({
  referenceId,
  className,
}: {
  referenceId: string
  className?: string
}) {
  const [pending, setPending] = useState(false)

  async function onExport() {
    setPending(true)
    try {
      const res = await fetch(
        `/api/reference-onepager-pptx?referenceId=${encodeURIComponent(referenceId)}`,
        { method: 'GET', credentials: 'same-origin' }
      )
      if (!res.ok) {
        let msg = 'Export fehlgeschlagen.'
        try {
          const j = (await res.json()) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          /* ignore */
        }
        toast.error(msg)
        return
      }
      const blob = await res.blob()
      const fallback = `RefStack_Onepager_${referenceId.slice(0, 8)}.pptx`
      const fromHeader = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'))
      const fileName = fromHeader ? decodeURIComponent(fromHeader.replace(/^"|"$/g, '')) : fallback
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('PowerPoint One-Pager wurde heruntergeladen.')
    } catch {
      toast.error('Netzwerkfehler beim Export.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() => void onExport()}
    >
      <AppIcon icon={FileDownIcon} size={16} />
      {pending ? 'PPTX wird erstellt…' : 'PPTX Export'}
    </Button>
  )
}
