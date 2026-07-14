'use client'

import type { ReactNode } from 'react'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { CognismAppSidebar } from '@/components/dashboard/cognism/cognism-app-sidebar'
import { CognismShellFrame } from '@/components/dashboard/cognism/cognism-shell-frame'
import { DashboardListPageHeader } from '@/components/dashboard/dashboard-list-page-header'
import { SupportChannelsDialog } from '@/components/dashboard/SupportChannelsDialog'
import { SupportTicketModal } from '@/components/dashboard/SupportTicketModal'
import { CommandPalette } from '@/components/ui/command-palette'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { RoleProvider } from '@/hooks/useRole'
import type { User } from '@supabase/supabase-js'
import {
  COGNISM_CONTENT_AREA_CLASS,
  COGNISM_CONTENT_BLEED_CLASS,
  COGNISM_SIDEBAR_EXPANDED,
} from '@/lib/cognism-shell-styles'
import { detailRouteNeedsBottomPadding, routeExcludesDashboardContentPadding } from '@/lib/dashboard-ui'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { PanelLeft } from 'lucide-react'
import type { DashboardNotificationItem } from './actions'
import type { Profile } from './dashboard-types'

export type { Profile } from './dashboard-types'

function CognismMobileMenuButton() {
  const { setOpenMobile, isMobile } = useSidebar()
  if (!isMobile) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed left-4 top-4 z-40 size-9 bg-white shadow-sm md:hidden"
      onClick={() => setOpenMobile(true)}
      aria-label="Menü öffnen"
    >
      <PanelLeft className="size-4" />
    </Button>
  )
}

function CognismMobileSidebarSheet({
  sidebar,
}: {
  sidebar: ReactNode
}) {
  const { openMobile, setOpenMobile, isMobile } = useSidebar()
  if (!isMobile) return null

  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="w-[min(18rem,90vw)] p-0 [&>button]:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col">{sidebar}</div>
      </SheetContent>
    </Sheet>
  )
}

export function DashboardShell({
  children,
  user,
  profile,
  initialNotifications = [],
  workspaceBranding = null,
  devRolePreviewEnabled = false,
  devRolePreviewActive = false,
}: {
  children: ReactNode
  user: User
  profile: Profile
  initialNotifications?: DashboardNotificationItem[]
  workspaceBranding?: { enabled: boolean; primary: string; secondary: string } | null
  devRolePreviewEnabled?: boolean
  devRolePreviewActive?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketModalType, setTicketModalType] = useState<'support' | 'feedback'>('support')
  const [supportChannelsOpen, setSupportChannelsOpen] = useState(false)

  useEffect(() => {
    router.prefetch(ROUTES.home)
    router.prefetch(ROUTES.accounts)
    router.prefetch(ROUTES.references.root)
    router.prefetch(ROUTES.deals.root)
    router.prefetch(ROUTES.match)
    router.prefetch(ROUTES.marketSignals)
    router.prefetch(ROUTES.deals.requestNew)
    router.prefetch(ROUTES.settings)
  }, [router])

  const userName =
    profile.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'Benutzer'
  const userEmail = user.email ?? ''
  const userInitials = (() => {
    const name = (profile.full_name ?? user.user_metadata?.full_name ?? '').trim()
    if (name) {
      const words = name.split(/\s+/).filter(Boolean)
      if (words.length >= 2) {
        const a = words[0]?.charAt(0) ?? ''
        const b = words[1]?.charAt(0) ?? ''
        return (a + b).toUpperCase() || 'U'
      }
      const firstWord = words[0] ?? ''
      if (firstWord.length >= 2) return firstWord.slice(0, 2).toUpperCase()
      if (firstWord.length === 1) return firstWord.toUpperCase()
    }
    return user.email?.slice(0, 2).toUpperCase() ?? 'U'
  })()

  const brandingStyle = workspaceBranding?.enabled
    ? ({
        ['--primary' as never]: workspaceBranding.primary,
        ['--sidebar-primary' as never]: workspaceBranding.primary,
        ['--ring' as never]: workspaceBranding.secondary,
        ['--cognism-nav-active-border' as never]: workspaceBranding.primary,
        ['--cognism-nav-active-text' as never]: workspaceBranding.primary,
        ['--cognism-btn-top' as never]: workspaceBranding.primary,
        ['--cognism-btn-bottom' as never]: workspaceBranding.secondary,
        ['--cognism-btn-hover-bottom' as never]: workspaceBranding.secondary,
      } as React.CSSProperties)
    : undefined

  const sidebarProps = {
    profile,
    userId: user.id,
    userName,
    userEmail,
    userInitials,
    initialNotifications,
    devRolePreviewEnabled,
    devRolePreviewActive,
    onSupportOpen: () => setSupportChannelsOpen(true),
    onFeedbackOpen: () => {
      setTicketModalType('feedback')
      setTicketModalOpen(true)
    },
  }

  const sidebar = <CognismAppSidebar {...sidebarProps} />

  return (
    <RoleProvider
      key={`${profile.systemRole}:${profile.functionRole}`}
      systemRole={profile.systemRole}
      functionRole={profile.functionRole}
      capabilities={profile.capabilities}
    >
      <div className="w-full min-w-0" style={brandingStyle}>
        <SidebarProvider
          className="block min-h-0 w-full"
          style={
            {
              '--sidebar-width': COGNISM_SIDEBAR_EXPANDED,
            } as React.CSSProperties
          }
        >
          <CognismShellFrame className="min-h-0 flex-1" sidebar={sidebar}>
            <CognismMobileMenuButton />
            <CognismMobileSidebarSheet
              sidebar={<CognismAppSidebar {...sidebarProps} forceExpanded />}
            />
            <div
              className={cn(
                routeExcludesDashboardContentPadding(pathname)
                  ? COGNISM_CONTENT_BLEED_CLASS
                  : COGNISM_CONTENT_AREA_CLASS,
                detailRouteNeedsBottomPadding(pathname) && 'pb-10',
                'h-full min-h-0 overflow-y-auto'
              )}
            >
              <Suspense fallback={null}>
                <DashboardListPageHeader />
              </Suspense>
              {children}
            </div>
          </CognismShellFrame>
          <CommandPalette />
          <SupportChannelsDialog open={supportChannelsOpen} onOpenChange={setSupportChannelsOpen} />
          <SupportTicketModal
            isOpen={ticketModalOpen}
            onOpenChange={setTicketModalOpen}
            type={ticketModalType}
          />
        </SidebarProvider>
      </div>
    </RoleProvider>
  )
}
