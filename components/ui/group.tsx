import * as React from 'react'

import { cn } from '@/lib/utils'

function Group({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="group"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-muted p-1',
        className,
      )}
      {...props}
    />
  )
}

export { Group }
