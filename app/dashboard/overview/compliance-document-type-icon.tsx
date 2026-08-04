'use client'

import { Lock } from 'lucide-react'

import {
  complianceDocumentUsesIsoBadge,
  ISO_BADGE_SRC,
} from '@/lib/compliance/document-icon'
import { cn } from '@/lib/utils'

type Props = {
  documentType: string
  title?: string | null
  fileName?: string | null
  className?: string
}

export function ComplianceDocumentTypeIcon({
  documentType,
  title,
  fileName,
  className,
}: Props) {
  const showIso = complianceDocumentUsesIsoBadge({
    document_type: documentType,
    title,
    file_name: fileName,
  })

  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-white',
        className,
      )}
    >
      {showIso ? (
        <img
          src={ISO_BADGE_SRC}
          alt="ISO"
          width={32}
          height={32}
          className="size-full object-contain p-0.5"
          decoding="async"
        />
      ) : (
        <Lock className="size-4 text-slate-500" aria-hidden />
      )}
    </span>
  )
}
