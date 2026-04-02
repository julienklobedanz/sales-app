'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Moon,
  SearchIcon,
  SettingsIcon,
  Sun,
} from '@hugeicons/core-free-icons'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
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
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { type AppRole } from '@/hooks/useRole'
import { createClient } from '@/lib/supabase/client'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export function DashboardHeader({
  userName,
  userEmail,
  userInitials,
  userRole,
}: {
  userName: string
  userEmail: string
  userInitials: string
  userRole: AppRole
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { setOpen } = useCommandPalette()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(ROUTES.login)
  }

  const headerMeta = useMemo(() => {
    if (!pathname) return { title: 'Dashboard', subtitle: undefined as string | undefined }

    if (pathname === ROUTES.home) {
      return {
        title: 'Dashboard',
        subtitle: 'Übersicht und Schnellzugriffe',
      }
    }
    if (pathname.startsWith(ROUTES.evidence.root)) {
      return {
        title: COPY.pages.evidence,
        subtitle: 'Referenzen verwalten und finden',
      }
    }
    if (pathname.startsWith(ROUTES.accounts)) {
      return {
        title: 'Accounts',
        subtitle: 'Strategisches Account-Management',
      }
    }
    if (pathname.startsWith(ROUTES.deals.root)) {
      return {
        title: 'Deals',
        subtitle: 'Deals und Referenz-Anfragen',
      }
    }
    if (pathname.startsWith(ROUTES.match)) {
      return {
        title: COPY.pages.match,
        subtitle: 'Semantische Suche und RFP-Analyse',
      }
    }
    if (pathname.startsWith(ROUTES.marketSignals)) {
      return {
        title: COPY.pages.marketSignals,
        subtitle: 'News, Trends und Signale (in Arbeit)',
      }
    }
    if (pathname.startsWith(ROUTES.settings)) {
      return {
        title: 'Einstellungen',
        subtitle: `${COPY.misc.workspace}, Team und Profil`,
      }
    }
    return {
      title: 'Dashboard',
      subtitle: undefined,
    }
  }, [pathname])

  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-4 py-3 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-2">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0 md:hidden" aria-label="Menü öffnen" />
        <SidebarTrigger className="-ml-1 shrink-0 hidden md:inline-flex" aria-label="Sidebar ein-/ausklappen" />
        <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />

        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight truncate">{headerMeta.title}</div>
          {headerMeta.subtitle ? (
            <div className="text-sm text-muted-foreground truncate">
              {headerMeta.subtitle}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Button
          type="button"
          variant="outline"
          className="hidden md:flex items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <AppIcon icon={SearchIcon} size={16} />
          <span className="text-sm">Suche</span>
          <Kbd>⌘K</Kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Command Palette öffnen"
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <AppIcon icon={SearchIcon} size={20} />
        </Button>

        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted/60 transition-colors"
          aria-label="Benachrichtigungen"
        >
          <AppIcon icon={Bell} size={20} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            3
          </span>
        </button>

        <Separator orientation="vertical" className="h-6 shrink-0" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 gap-2 px-2 font-normal hover:bg-muted/60"
              aria-label="Profilmenü"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[160px] truncate text-left text-sm font-medium sm:inline">
                {userName}
              </span>
              <AppIcon icon={ChevronsUpDown} size={16} className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg shadow-xl"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                  <span className="bg-primary/10 text-primary mt-1 w-fit rounded px-1 py-0.5 text-[10px] font-bold uppercase">
                    {userRole}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? (
                  <AppIcon icon={Sun} size={16} className="mr-2" />
                ) : (
                  <AppIcon icon={Moon} size={16} className="mr-2" />
                )}
                Theme umschalten
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(ROUTES.settings)}>
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
      </div>
    </header>
  )
}
