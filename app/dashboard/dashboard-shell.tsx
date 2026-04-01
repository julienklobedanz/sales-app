'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  FileText,
  SettingsIcon,
  GalleryHorizontalEndIcon,
  LifeBuoy,
  Send,
  ChevronsUpDown,
  LogOut,
  BrainCircuit,
  Handshake,
  TrendingUp,
  Moon,
  Sun,
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
  SidebarFooter,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DashboardHeader } from './dashboard-header'
import { SupportTicketModal } from '@/components/dashboard/SupportTicketModal'
import { createClient } from '@/lib/supabase/client'
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

export type Profile = {
  full_name: string | null
  role: AppRole
}

export function DashboardShell({
  children,
  user,
  profile,
}: {
  children: React.ReactNode
  user: User
  profile: Profile
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(ROUTES.login)
  }

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
    <RoleProvider role={profile.role}>
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

        <SidebarFooter className="px-2 pb-3 pt-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl px-2 py-2"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 items-center text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                    </div>
                    <span className="ml-auto">
                      <AppIcon icon={ChevronsUpDown} size={16} />
                    </span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg shadow-xl"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {userName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {userEmail}
                        </span>
                        <span className="bg-primary/10 text-primary mt-1 w-fit rounded px-1 py-0.5 text-[10px] font-bold uppercase">
                          {profile.role}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() =>
                        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                      }
                    >
                      {resolvedTheme === 'dark' ? (
                        <AppIcon icon={Sun} size={16} className="mr-2" />
                      ) : (
                        <AppIcon icon={Moon} size={16} className="mr-2" />
                      )}
                      Theme umschalten
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => router.push(ROUTES.settings)}
                    >
                    <AppIcon icon={SettingsIcon} size={16} className="mr-2" />
                      Account
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <AppIcon icon={LogOut} size={16} className="mr-2" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <DashboardHeader />
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
