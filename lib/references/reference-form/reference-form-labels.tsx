'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Label } from '@/components/ui/label'

type BaseLabelProps = ComponentProps<typeof Label>

export function RequiredLabel({
  className,
  children,
  ...props
}: BaseLabelProps & { children?: ReactNode }) {
  const base = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'
  return (
    <Label className={className ? `${base} ${className}` : base} {...props}>
      {children}
      <span className="ml-1 text-destructive">*</span>
    </Label>
  )
}

export function OptionalLabel({
  className,
  children,
  ...props
}: BaseLabelProps & { children?: ReactNode }) {
  const base = 'text-xs font-medium uppercase tracking-wider text-muted-foreground'
  return (
    <Label className={className ? `${base} ${className}` : base} {...props}>
      {children}
    </Label>
  )
}
