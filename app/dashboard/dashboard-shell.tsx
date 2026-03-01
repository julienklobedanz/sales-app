'use client'

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
  BriefcaseIcon,
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

  const userInitials =
    user.email?.slice(0, 2).toUpperCase() || 'U'
  const userName =
    profile.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'Benutzer'
  const userEmail = user.email ?? ''

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Refstack</span>
                    <span className="text-xs">v1.0.0</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {isAdmin ? (
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
                        isActive={pathname?.startsWith('/dashboard/entwuerfe')}
                        tooltip="Entwürfe"
                        className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <Link href="/dashboard/entwuerfe">
                          <FilePen />
                          <span>Entwürfe</span>
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
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="sm" tooltip="Support">
                    <Link href="#">
                      <LifeBuoy />
                      <span>Hilfe & Support</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="sm" tooltip="Feedback">
                    <Link href="#">
                      <Send />
                      <span>Feedback senden</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    tooltip="Einstellungen"
                    isActive={pathname?.startsWith('/dashboard/settings')}
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

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs">{userEmail}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
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
                      <BriefcaseIcon className="mr-2 size-4 text-primary" />
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
    </SidebarProvider>
  )
}
