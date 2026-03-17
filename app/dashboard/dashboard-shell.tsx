'use client'

import { useState } from 'react'
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
  FilePen,
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
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard'}
                        tooltip="Referenzen"
                        className="group relative overflow-hidden rounded-xl border border-transparent px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:border-primary/80 data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard" className="flex items-center gap-2.5">
                          <div className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary opacity-0 transition-opacity duration-150 group-data-[active=true]:opacity-100" />
                          <FileTextIcon className="relative z-10 size-4" strokeWidth={2.5} />
                          <span className="relative z-10">Referenzen</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/deals')}
                        tooltip="Deals"
                        className="group relative overflow-hidden rounded-xl border border-transparent px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:border-primary/80 data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/deals" className="flex items-center gap-2.5">
                          <div className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary opacity-0 transition-opacity duration-150 group-data-[active=true]:opacity-100" />
                          <HandshakeIcon className="relative z-10 size-4" strokeWidth={2.5} />
                          <span className="relative z-10">Deals</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname?.startsWith('/dashboard/companies')}
                        tooltip="Client Intelligence – Firmenübersicht, Executive Profiling & Stakeholder-Mapping (in Vorbereitung)"
                        className="group relative overflow-hidden rounded-xl border border-transparent px-2 py-1.5 text-sm font-medium transition-all duration-200 ease-in-out hover:translate-x-1 hover:bg-muted/60 data-[active=true]:border-primary/80 data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/companies" className="flex items-center gap-2.5">
                          <div className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary opacity-0 transition-opacity duration-150 group-data-[active=true]:opacity-100" />
                          <BrainCircuit className="relative z-10 size-4" strokeWidth={2.5} />
                          <span className="relative z-10">Client Intelligence</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                ) : (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard'}
                        tooltip="Referenzen"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard">
                          <FileTextIcon />
                          <span>Referenzen</span>
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
                        isActive={pathname?.startsWith('/dashboard/companies')}
                        tooltip="Client Intelligence – Firmenübersicht, Executive Profiling & Stakeholder-Mapping (in Vorbereitung)"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/companies">
                          <BrainCircuit />
                          <span>Client Intelligence</span>
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
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {userEmail}
                      </span>
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
                        <span className="truncate text-xs">{userEmail}</span>
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
