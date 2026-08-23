'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DEAL_DOCUMENT_KINDS,
  DEAL_DOCUMENT_KIND_LABELS,
  type DealDocumentKind,
} from '@/lib/deals/deal-document-kinds'

export function DealDocumentKindSelect({
  value,
  onValueChange,
  id,
}: {
  value: DealDocumentKind
  onValueChange: (v: DealDocumentKind) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as DealDocumentKind)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DEAL_DOCUMENT_KINDS.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {DEAL_DOCUMENT_KIND_LABELS[kind]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
