'use client'

import type { ReactNode } from 'react'

import { useSidebar } from '@/components/ui/sidebar'
import {
  cognismShellFrameClass,
  cognismShellMainPanelClass,
  cognismShellOuterClass,
  cognismShellSidebarPanelClass,
  COGNISM_SIDEBAR_COLLAPSED,
  COGNISM_SIDEBAR_EXPANDED,
} from '@/lib/cognism-shell-styles'
import { cn } from '@/lib/utils'

export function CognismShellFrame({
  sidebar,
  children,
  className,
}: {
  sidebar: ReactNode
  children: ReactNode
  className?: string
}) {
  const { state } = useSidebar()
  const sidebarWidth = state === 'collapsed' ? COGNISM_SIDEBAR_COLLAPSED : COGNISM_SIDEBAR_EXPANDED

  return (
    <div className={cn('theme-cognism', cognismShellOuterClass, className)}>
      <div className={cognismShellFrameClass}>
        <div
          className={cognismShellSidebarPanelClass}
          style={{ '--cognism-sidebar-width': sidebarWidth } as React.CSSProperties}
        >
          {sidebar}
        </div>
        <div className={cognismShellMainPanelClass}>{children}</div>
      </div>
    </div>
  )
}
