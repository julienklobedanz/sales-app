'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Handshake, Radar } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DashboardHeader } from './dashboard-header'
import { SupportTicketModal } from '@/components/dashboard/SupportTicketModal'
import { SupportChannelsDialog } from '@/components/dashboard/SupportChannelsDialog'
import { DashboardUserMenu } from '@/components/dashboard/dashboard-user-menu'
import { SidebarCommandSearch } from '@/components/dashboard/sidebar-command-search'
import { SidebarNotificationsSection } from '@/components/dashboard/sidebar-notifications-button'
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

  // Prefetch wichtige Routen für snappige Navigation
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
        // shadcn token variables (used by bg-primary/text-primary/ring-primary etc.)
        ['--primary' as never]: workspaceBranding.primary,
        ['--sidebar-primary' as never]: workspaceBranding.primary,
        ['--ring' as never]: workspaceBranding.secondary,
      } as React.CSSProperties)
    : undefined

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
        <SidebarProvider>
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
          <SidebarGroup className="space-y-0 px-2 pb-2 pt-1">
            <SidebarGroupContent>
              <SidebarCommandSearch />
            </SidebarGroupContent>
          </SidebarGroup>

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
                    isActive={pathname?.startsWith(ROUTES.marketSignals)}
                    tooltip={COPY.nav.marketSignals}
                    className={navButtonClass}
                  >
                    <Link href={ROUTES.marketSignals} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <Radar
                          className="size-4 shrink-0"
                          strokeWidth={pathname?.startsWith(ROUTES.marketSignals) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.marketSignals}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(ROUTES.references.root)}
                    tooltip={COPY.nav.references}
                    className={navButtonClass}
                  >
                    <Link href={ROUTES.references.root} className="flex items-center gap-2.5">
                      <span className="relative z-10">
                        <AppIcon
                          icon={FileText}
                          size={16}
                          strokeWidth={pathname?.startsWith(ROUTES.references.root) ? 2.5 : 2}
                        />
                      </span>
                      <span className="relative z-10">{COPY.nav.references}</span>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto space-y-0 px-2 pb-2 pt-2">
            <div className="mb-1.5 flex w-full gap-1.5 group-data-[collapsible=icon]:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSupportChannelsOpen(true)}
                    className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Support erhalten"
                  >
                    <AppIcon icon={HeadsetIcon} size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Support erhalten</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketModalType('feedback')
                      setTicketModalOpen(true)
                    }}
                    className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Feedback senden"
                  >
                    <AppIcon icon={Send} size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Feedback senden</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={ROUTES.settings}
                    className={cn(
                      'flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      pathname?.startsWith(ROUTES.settings) && 'border-primary/30 bg-muted text-foreground'
                    )}
                    aria-label="Einstellungen"
                  >
                    <AppIcon icon={SettingsIcon} size={16} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">Einstellungen</TooltipContent>
              </Tooltip>
            </div>

            <SidebarNotificationsSection
              userId={user.id}
              userRole={legacyAppRoleFrom(profile.systemRole, profile.functionRole)}
              initialNotifications={initialNotifications}
            />

            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <DashboardUserMenu
                  userName={userName}
                  userEmail={userEmail}
                  userInitials={userInitials}
                  userRole={legacyAppRoleFrom(profile.systemRole, profile.functionRole)}
                  devRolePreviewEnabled={devRolePreviewEnabled}
                  devRolePreviewActive={devRolePreviewActive}
                />
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
          <DashboardHeader />
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
