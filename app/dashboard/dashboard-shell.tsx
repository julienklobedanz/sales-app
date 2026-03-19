'use client'

import { useState, useEffect } from 'react'
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
  ShieldCheckIcon,
  BrainCircuit,
  Briefcase,
  HandshakeIcon,
} from 'lucide-react'
import AnilabxIcon from '@/components/icons/anilabx-icon'
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
import { updateUserRole } from './actions'
import { toast } from 'sonner'

export type Profile = {
  full_name: string | null
  role: 'admin' | 'sales' | 'account_owner'
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

  const handleRoleChange = (newRole: 'admin' | 'sales') => {
    const promise = updateUserRole(newRole)
    toast.promise(promise, {
      loading: 'Rolle wird gewechselt...',
      success: `Rolle zu ${newRole} gewechselt`,
      error: 'Fehler beim Rollenwechsel',
    })
    promise.then(() => router.refresh(), () => {})
  }

  const isAdmin = profile.role === 'admin'

  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketModalType, setTicketModalType] = useState<'support' | 'feedback'>('support')

  // Prefetch wichtige Routen für snappige Navigation
  useEffect(() => {
    router.prefetch('/dashboard/deals')
    router.prefetch('/dashboard/companies')
    router.prefetch('/dashboard/ai-lab')
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
    <SidebarProvider defaultOpen={true}>
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
                {isAdmin ? (
                  <>
                    {/* 1. Intelligence (Der Kompass): Accounts */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/companies')}
                        tooltip="Accounts – Firmenübersicht, Executive Profiling & Stakeholder-Mapping"
                        className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                      >
                        <Link href="/dashboard/companies" className="flex items-center gap-2.5">
                          <BrainCircuit
                            className="relative z-10 size-4"
                            strokeWidth={pathname?.startsWith('/dashboard/companies') ? 2.5 : 2}
                          />
                          <span className="relative z-10">Accounts</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* 2. Execution (Das Schlachtfeld): Deals */}
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
                    {/* 3. Proof (Das Arsenal): Success Stories */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard'}
                        tooltip="Success Stories"
                        className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                      >
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                          <FileTextIcon
                            className="relative z-10 size-4"
                            strokeWidth={pathname === '/dashboard' ? 2.5 : 2}
                          />
                          <span className="relative z-10">Success Stories</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* 4. AI Lab – RFP-Analyzer & KI-Tools */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/ai-lab')}
                        tooltip="AI Lab – RFP-Analyzer und weitere KI-Tools"
                        className="group relative overflow-hidden rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:hover:translate-x-0"
                      >
                        <Link href="/dashboard/ai-lab" className="flex items-center gap-2.5">
                          <AnilabxIcon
                            className="relative z-10 size-4 shrink-0"
                            strokeWidth={pathname?.startsWith('/dashboard/ai-lab') ? 2.5 : 2}
                          />
                          <span className="relative z-10">AI Lab</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                ) : (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/companies')}
                        tooltip="Accounts"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/companies">
                          <BrainCircuit />
                          <span>Accounts</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/deals')}
                        tooltip="Deals"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/deals">
                          <HandshakeIcon />
                          <span>Deals</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard'}
                        tooltip="Success Stories"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard">
                          <FileTextIcon />
                          <span>Success Stories</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/ai-lab')}
                        tooltip="AI Lab"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/ai-lab" className="flex items-center gap-2.5">
                          <AnilabxIcon className="size-4 shrink-0" strokeWidth={2} />
                          <span>AI Lab</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
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
                      <span>Hilfe & Support</span>
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
                    <DropdownMenuLabel className="text-muted-foreground ml-2 text-[10px] uppercase">
                      Rolle wechseln (Test-Modus)
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() => handleRoleChange('admin')}
                    >
                      <ShieldCheckIcon className="mr-2 size-4 text-primary" />
                      Marketing / Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleRoleChange('sales')}
                    >
                      <Briefcase className="mr-2 size-4 text-primary" />
                      Sales Representative
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
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
      <SupportTicketModal
        isOpen={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        type={ticketModalType}
      />
    </SidebarProvider>
  )
}
