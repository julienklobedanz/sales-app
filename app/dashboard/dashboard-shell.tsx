'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Handshake, BarChart3 } from 'lucide-react'
import {
  Building2,
  FileText,
  SettingsIcon,
  GalleryHorizontalEndIcon,
  HeadsetIcon,
  Send,
  Sparkles,
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
import { SupportChannelsDialog } from '@/components/dashboard/SupportChannelsDialog'
import { type User } from '@supabase/supabase-js'
import { RoleProvider, type AppRole, type Capability, type FunctionRole, type SystemRole } from '@/hooks/useRole'
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
import { legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import { canViewInsights } from '@/lib/dashboard/can-view-insights'
import { cn } from '@/lib/utils'
import type { DashboardNotificationItem } from './actions'

export type Profile = {
  full_name: string | null
  role: AppRole
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities: Partial<Record<Capability, boolean>>
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
  children: React.ReactNode
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

  // Immer mit false starten (SSR + erster Client-Render), damit Radix useId-Reihenfolge stabil bleibt.
  const [forceCollapsed, setForceCollapsed] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const sync = () => setForceCollapsed(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  // Prefetch wichtige Routen für snappige Navigation
  useEffect(() => {
    router.prefetch(ROUTES.home)
    router.prefetch(ROUTES.accounts)
    router.prefetch(ROUTES.evidence.root)
    router.prefetch(ROUTES.deals.root)
    router.prefetch(ROUTES.match)
    router.prefetch(ROUTES.deals.requestNew)
    router.prefetch(ROUTES.settings)
    if (canViewInsights(profile.functionRole, profile.systemRole, profile.capabilities)) {
      router.prefetch(ROUTES.insights)
    }
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
        // shadcn token variables (used by bg-primary/text-primary/ring-primary etc.)
        ['--primary' as never]: workspaceBranding.primary,
        ['--sidebar-primary' as never]: workspaceBranding.primary,
        ['--ring' as never]: workspaceBranding.secondary,
      } as React.CSSProperties)
    : undefined

  const showInsightsNav = canViewInsights(
    profile.functionRole,
    profile.systemRole,
    profile.capabilities
  )
  const navButtonClass =
    'group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-gradient-to-b data-[active=true]:from-blue-600 data-[active=true]:to-blue-700 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] data-[active=true]:hover:translate-x-0'

  return (
    <RoleProvider
      key={`${profile.systemRole}:${profile.functionRole}`}
      systemRole={profile.systemRole}
      functionRole={profile.functionRole}
      capabilities={profile.capabilities}
    >
      <div style={brandingStyle}>
        <SidebarProvider
          defaultOpen={!forceCollapsed}
          open={forceCollapsed ? false : undefined}
          onOpenChange={forceCollapsed ? () => {} : undefined}
        >
          <Sidebar
            collapsible="icon"
            className="border-r border-sidebar-border/90 bg-sidebar"
          >
        <SidebarHeader className="flex h-[84px] shrink-0 flex-col justify-center gap-0 p-0 px-3">
          <SidebarMenu className="gap-0">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="h-auto min-h-0 py-0 hover:bg-transparent">
                <Link href={ROUTES.home} className="group/link flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                    <AppIcon icon={GalleryHorizontalEndIcon} size={16} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-semibold tracking-tight">
                      RefStack
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
                    isActive={pathname === ROUTES.home}
                    tooltip={COPY.pages.dashboard}
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-gradient-to-b data-[active=true]:from-blue-600 data-[active=true]:to-blue-700 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] data-[active=true]:hover:translate-x-0"
                  >
                    <Link href={ROUTES.home} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={GalleryHorizontalEndIcon}
                          size={16}
                          strokeWidth={pathname === ROUTES.home ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.pages.dashboard}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.match)}
                    tooltip={COPY.nav.match}
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-gradient-to-b data-[active=true]:from-blue-600 data-[active=true]:to-blue-700 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] data-[active=true]:hover:translate-x-0"
                  >
                    <Link href={ROUTES.match} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={Sparkles}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.match) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.match}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.evidence.root)}
                    tooltip={COPY.nav.evidence}
                    className={navButtonClass}
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
                    isActive={pathname?.startsWith(ROUTES.deals.root)}
                    tooltip={COPY.nav.deals}
                    className={navButtonClass}
                  >
                    <Link href={ROUTES.deals.root} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <Handshake
                          className="size-4 shrink-0"
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
                    isActive={pathname?.startsWith(ROUTES.accounts)}
                    tooltip={COPY.nav.accounts}
                    className={navButtonClass}
                  >
                    <Link href={ROUTES.accounts} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={Building2}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.accounts) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.accounts}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {showInsightsNav ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname?.startsWith(ROUTES.insights)}
                      tooltip={COPY.nav.insights}
                      className={navButtonClass}
                    >
                      <Link href={ROUTES.insights} className="flex items-center gap-2.5">
                        <span className="relative z-10">
                          <BarChart3
                            className="size-4 shrink-0"
                            strokeWidth={pathname?.startsWith(ROUTES.insights) ? 2.5 : 2}
                          />
                        </span>
                        <span className="relative z-10">{COPY.nav.insights}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto space-y-0 border-t border-sidebar-border/60 px-2 pt-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    tooltip="Support erhalten"
                    className="group rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60"
                  >
                    <button
                      type="button"
                      onClick={() => setSupportChannelsOpen(true)}
                      className="w-full"
                    >
                      <AppIcon icon={HeadsetIcon} size={16} />
                      <span>Support erhalten</span>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <Suspense
          fallback={
            <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            </div>
          }
        >
          <DashboardHeader
            userId={user.id}
            userName={userName}
            userEmail={userEmail}
            userInitials={userInitials}
            userRole={legacyAppRoleFrom(profile.systemRole, profile.functionRole)}
            initialNotifications={initialNotifications}
            devRolePreviewEnabled={devRolePreviewEnabled}
            devRolePreviewActive={devRolePreviewActive}
          />
        </Suspense>
        <div
          className={cn(
            routeExcludesDashboardContentPadding(pathname)
              ? DASHBOARD_SCROLL_AREA_BLEED_CLASS
              : DASHBOARD_SCROLL_AREA_CLASS,
            "bg-background",
            detailRouteNeedsBottomPadding(pathname) && 'pb-10'
          )}
        >
          {children}
        </div>
      </SidebarInset>
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
