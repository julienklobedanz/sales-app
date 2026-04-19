'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  SettingsIcon,
  GalleryHorizontalEndIcon,
  LifeBuoy,
  Send,
  BrainCircuit,
  Handshake,
  TrendingUp,
} from '@hugeicons/core-free-icons'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar'
import { DashboardHeader } from './dashboard-header'
import { SupportTicketModal } from '@/components/dashboard/SupportTicketModal'
import { type User } from '@supabase/supabase-js'
import { RoleProvider, type AppRole } from '@/hooks/useRole'
import { CommandPalette } from '@/components/ui/command-palette'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import {
  DASHBOARD_SCROLL_AREA_BLEED_CLASS,
  DASHBOARD_SCROLL_AREA_CLASS,
  detailRouteNeedsBottomPadding,
  routeExcludesDashboardContentPadding,
} from '@/lib/dashboard-ui'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { DashboardNotificationItem } from './actions'

export type Profile = {
  full_name: string | null
  role: AppRole
}

export function DashboardShell({
  children,
  user,
  profile,
  roleTestModeEnabled = false,
  initialNotifications = [],
}: {
  children: React.ReactNode
  user: User
  profile: Profile
  /** Server: gleiche Quelle wie Cookie-Vorschau – Test-Modus „Rolle wechseln“ im Profilmenü. */
  roleTestModeEnabled?: boolean
  initialNotifications?: DashboardNotificationItem[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  const isAdmin = profile.role === 'admin'

  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketModalType, setTicketModalType] = useState<'support' | 'feedback'>('support')

  const [forceCollapsed, setForceCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(max-width: 1023px)').matches ?? false
  })

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const onChange = () => setForceCollapsed(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Prefetch wichtige Routen für snappige Navigation
  useEffect(() => {
    router.prefetch(ROUTES.home)
    router.prefetch(ROUTES.deals.root)
    router.prefetch(ROUTES.accounts)
    router.prefetch(ROUTES.evidence.root)
    router.prefetch(ROUTES.marketSignals)
    router.prefetch(ROUTES.match)
    router.prefetch(ROUTES.request)
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

  return (
    <RoleProvider key={profile.role} role={profile.role}>
      <SidebarProvider
        defaultOpen={!forceCollapsed}
        open={forceCollapsed ? false : undefined}
        onOpenChange={forceCollapsed ? () => {} : undefined}
      >
        <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                <Link href={ROUTES.home}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <AppIcon icon={GalleryHorizontalEndIcon} size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-sm font-semibold tracking-tight">
                      Refstack
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="space-y-0 px-2 py-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.accounts)}
                    tooltip={COPY.nav.accounts}
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href={ROUTES.accounts} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={BrainCircuit}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.accounts) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.accounts}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.deals.root)}
                    tooltip={COPY.nav.deals}
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href={ROUTES.deals.root} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={Handshake}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.deals.root) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.deals}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.evidence.root)}
                    tooltip={COPY.nav.evidence}
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href={ROUTES.evidence.root} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={FileText}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.evidence.root) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.evidence}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.marketSignals)}
                    tooltip={COPY.nav.marketSignals}
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href={ROUTES.marketSignals} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={TrendingUp}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.marketSignals) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.marketSignals}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto space-y-0 border-t border-sidebar-border/60 px-2 pt-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {isAdmin ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="sm"
                      tooltip="Einstellungen"
                      isActive={pathname?.startsWith(ROUTES.settings)}
                      className="group rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-muted data-[active=true]:text-foreground"
                    >
                      <Link href={ROUTES.settings}>
                        <AppIcon icon={SettingsIcon} size={16} />
                        <span>Einstellungen</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    tooltip="Support"
                    className="group rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTicketModalType('support')
                        setTicketModalOpen(true)
                      }}
                      className="w-full"
                    >
                      <AppIcon icon={LifeBuoy} size={16} />
                      <span>Support</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    tooltip="Feedback"
                    className="group rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTicketModalType('feedback')
                        setTicketModalOpen(true)
                      }}
                      className="w-full"
                    >
                      <AppIcon icon={Send} size={16} />
                      <span>Feedback senden</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <DashboardHeader
          userName={userName}
          userEmail={userEmail}
          userInitials={userInitials}
          userRole={profile.role}
          roleTestModeEnabled={roleTestModeEnabled}
          initialNotifications={initialNotifications}
        />
        <div
          className={cn(
            routeExcludesDashboardContentPadding(pathname)
              ? DASHBOARD_SCROLL_AREA_BLEED_CLASS
              : DASHBOARD_SCROLL_AREA_CLASS,
            detailRouteNeedsBottomPadding(pathname) && 'pb-10'
          )}
        >
          {children}
        </div>
      </SidebarInset>
      <CommandPalette />
      <SupportTicketModal
        isOpen={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        type={ticketModalType}
      />
      </SidebarProvider>
    </RoleProvider>
  )
}
