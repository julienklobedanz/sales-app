'use client'

import type { ReactNode } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { cn } from '@/lib/utils'

export function CollectionReadLayout({
  variant = 'embedded',
  list,
  pane,
  className,
}: {
  variant?: 'embedded' | 'standalone'
  list: ReactNode
  pane: ReactNode
  className?: string
}) {
  const rootClass =
    variant === 'embedded'
      ? 'flex min-h-[480px] h-[min(calc(100svh-11rem),56rem)] flex-col gap-2'
      : 'flex h-[calc(100svh-7rem)] flex-col gap-4 p-4'

  return (
    <div className={cn(rootClass, className)}>
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-0 flex-1 rounded-lg border bg-background"
      >
        <ResizablePanel defaultSize="42%" minSize={28}>
          <div className="flex h-full min-h-0 flex-col">{list}</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="58%" minSize={38}>
          <div className="flex h-full min-h-0 flex-col">{pane}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
