import * as React from 'react'

import { cn } from '@/lib/utils'

function Option({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="option"
      className={cn(
        'rounded-md border border-border bg-card p-2 text-sm',
        'has-[:checked]:border-primary has-[:checked]:bg-primary/5',
        'data-[selected=true]:border-primary data-[selected=true]:bg-primary/5',
        className,
      )}
      {...props}
    />
  )
}

export { Option }
