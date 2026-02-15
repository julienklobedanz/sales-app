'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGridIcon,
  StarIcon,
  SettingsIcon,
  ClockIcon,
  GalleryVerticalEnd,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar'
import { DashboardHeader } from './dashboard-header'

export function DashboardShell({
  children,
  showAdmin = false,
}: {
  children: React.ReactNode
  showAdmin?: boolean
}) {
  const pathname = usePathname()

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Refstack</span>
                    <span className="">v1.0.0</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/dashboard'}
                    tooltip="Explorer"
                  >
                    <Link href="/dashboard">
                      <LayoutGridIcon />
                      <span>Explorer</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/dashboard/requests')}
                    tooltip="Anfragen"
                  >
                    <Link href="/dashboard/requests">
                      <ClockIcon />
                      <span>Anfragen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith('/dashboard/favorites')}
                    tooltip="Favoriten"
                  >
                    <Link href="/dashboard/favorites">
                      <StarIcon />
                      <span>Favoriten</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {showAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Einstellungen</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname?.startsWith('/dashboard/admin')}
                      tooltip="Admin"
                    >
                      <Link href="/dashboard">
                        <SettingsIcon />
                        <span>Admin</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
