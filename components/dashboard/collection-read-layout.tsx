'use client'

import type { ReactNode } from 'react'
import { ArrowLeftIcon } from '@hugeicons/core-free-icons'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function CollectionReadLayout({
  variant = 'embedded',
  list,
  pane,
  className,
  hasSelection = false,
  onBack,
}: {
  variant?: 'embedded' | 'standalone'
  list: ReactNode
  pane: ReactNode
  className?: string
  hasSelection?: boolean
  onBack?: () => void
}) {
  const isMobile = useIsMobile()
  const showList = !isMobile || !hasSelection
  const showPane = !isMobile || hasSelection
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
        {showList ? (
          <ResizablePanel defaultSize={showPane ? '42%' : '100%'} minSize={showPane ? 28 : 100}>
            <div className="flex h-full min-h-0 flex-col">{list}</div>
          </ResizablePanel>
        ) : null}
        {showList && showPane ? <ResizableHandle withHandle /> : null}
        {showPane ? (
          <ResizablePanel defaultSize={showList ? '58%' : '100%'} minSize={showList ? 38 : 100}>
            <div className="flex h-full min-h-0 flex-col">
              {isMobile && hasSelection && onBack ? (
                <div className="border-b px-2 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2"
                    onClick={onBack}
                  >
                    <AppIcon icon={ArrowLeftIcon} size={16} />
                    Zurück zur Liste
                  </Button>
                </div>
              ) : null}
              <div className="min-h-0 flex-1">{pane}</div>
            </div>
          </ResizablePanel>
        ) : null}
      </ResizablePanelGroup>
    </div>
  )
}
