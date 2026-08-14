'use client'

import type { ReactNode } from 'react'

import { useSidebar } from '@/components/ui/sidebar'
import {
  shellFrameClass,
  shellMainPanelClass,
  shellOuterClass,
  shellSidebarPanelClass,
  SHELL_SIDEBAR_COLLAPSED,
  SHELL_SIDEBAR_EXPANDED,
} from '@/lib/shell-styles'
import { cn } from '@/lib/utils'

export function ShellFrame({
  sidebar,
  children,
  className,
}: {
  sidebar: ReactNode
  children: ReactNode
  className?: string
}) {
  const { state } = useSidebar()
  const sidebarWidth =
    state === 'collapsed' ? SHELL_SIDEBAR_COLLAPSED : SHELL_SIDEBAR_EXPANDED

  return (
    <div className={cn('theme-shell', shellOuterClass, className)}>
      <div className={shellFrameClass}>
        <div
          className={shellSidebarPanelClass}
          style={{ '--shell-sidebar-width': sidebarWidth } as React.CSSProperties}
        >
          {sidebar}
        </div>
        <div className={shellMainPanelClass}>{children}</div>
      </div>
    </div>
  )
}
