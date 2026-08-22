import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const ablageState = cva(
  'rounded-lg border-2 border-dashed transition-colors',
  {
    variants: {
      state: {
        rest: 'cursor-pointer border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30',
        active: 'cursor-pointer border-primary bg-primary/5',
        disabled:
          'pointer-events-none cursor-not-allowed border-muted-foreground/30 bg-muted/20 opacity-60',
      },
    },
    defaultVariants: { state: 'rest' },
  },
)

function Ablage({
  className,
  state,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof ablageState>) {
  return (
    <div data-slot="ablage" className={cn(ablageState({ state }), className)} {...props} />
  )
}

export { Ablage, ablageState }
