import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'

export function ApprovalOptionalLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: ReactNode
}) {
  return (
    <Label htmlFor={htmlFor} className="font-medium">
      {children}{' '}
      <span className="text-xs font-normal italic text-muted-foreground">(optional)</span>
    </Label>
  )
}

export function ApprovalRequiredMark() {
  return <span className="text-destructive"> *</span>
}
