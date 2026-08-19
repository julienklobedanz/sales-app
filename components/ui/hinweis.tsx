import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const hinweisTone = cva('rounded-md border p-2 text-xs', {
  variants: {
    tone: {
      muted: 'border-border bg-muted text-muted-foreground',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
      warning:
        'border-status-warning-border bg-status-warning-muted text-status-warning-foreground',
    },
  },
  defaultVariants: { tone: 'muted' },
})

function Hinweis({
  className,
  tone,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof hinweisTone>) {
  return (
    <div data-slot="hinweis" className={cn(hinweisTone({ tone }), className)} {...props} />
  )
}

export { Hinweis, hinweisTone }
