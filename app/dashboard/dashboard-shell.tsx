'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileTextIcon,
  SettingsIcon,
  GalleryVerticalEnd,
  LifeBuoy,
  Send,
  ChevronsUpDown,
  LogOut,
  BrainCircuit,
  HandshakeIcon,
  TrendingUp,
  Moon,
  Sun,
} from 'lucide-react'
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile.role === 'admin'

  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketModalType, setTicketModalType] = useState<'support' | 'feedback'>('support')

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try {
      window.localStorage.setItem('theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  const isIconMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(max-width: 1023px)').matches ?? false
  }, [])
  const [forceCollapsed, setForceCollapsed] = useState(isIconMode)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)')
    const onChange = () => setForceCollapsed(mql.matches)
    mql.addEventListener('change', onChange)
    setForceCollapsed(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Prefetch wichtige Routen für snappige Navigation
  useEffect(() => {
    router.prefetch('/dashboard/deals')
    router.prefetch('/dashboard/accounts')
    router.prefetch('/dashboard/evidence')
    router.prefetch('/dashboard/market-signals')
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
                <Link href="/dashboard">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <GalleryVerticalEnd className="size-5" strokeWidth={2.5} />
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
                    isActive={pathname?.startsWith('/dashboard/accounts')}
                    tooltip="Accounts"
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href="/dashboard/accounts" className="flex items-center gap-2.5">
                      <BrainCircuit
                        className="relative z-10 size-4"
                        strokeWidth={pathname?.startsWith('/dashboard/accounts') ? 2.5 : 2}
                      />
                      <span className="relative z-10">Accounts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/dashboard/deals')}
                    tooltip="Deals"
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href="/dashboard/deals" className="flex items-center gap-2.5">
                      <HandshakeIcon
                        className="relative z-10 size-4"
                        strokeWidth={pathname?.startsWith('/dashboard/deals') ? 2.5 : 2}
                      />
                      <span className="relative z-10">Deals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/dashboard/evidence')}
                    tooltip="Evidence Hub"
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href="/dashboard/evidence" className="flex items-center gap-2.5">
                      <FileTextIcon
                        className="relative z-10 size-4"
                        strokeWidth={pathname?.startsWith('/dashboard/evidence') ? 2.5 : 2}
                      />
                      <span className="relative z-10">Evidence Hub</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/dashboard/market-signals')}
                    tooltip="Market Signals"
                    className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                  >
                    <Link href="/dashboard/market-signals" className="flex items-center gap-2.5">
                      <TrendingUp
                        className="relative z-10 size-4"
                        strokeWidth={pathname?.startsWith('/dashboard/market-signals') ? 2.5 : 2}
                      />
                      <span className="relative z-10">Market Signals</span>
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
                      isActive={pathname?.startsWith('/dashboard/settings')}
                      className="group rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-muted data-[active=true]:text-foreground"
                    >
                      <Link href="/dashboard/settings">
                        <SettingsIcon />
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
                      <LifeBuoy />
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
                      <Send />
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
                    <ChevronsUpDown className="ml-auto size-4" />
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
                      onSelect={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                    >
                      {theme === 'dark' ? (
                        <Sun className="mr-2 size-4" />
                      ) : (
                        <Moon className="mr-2 size-4" />
                      )}
                      Theme umschalten
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => router.push('/dashboard/settings')}
                    >
                      <SettingsIcon className="mr-2 size-4" />
                      Account
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
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
