'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Bell,
  Briefcase,
  LogOut,
  MailOpen,
  Moon,
  SearchIcon,
  SettingsIcon,
  Shield,
  Sun,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/routes'
import { toast } from 'sonner'
import { clearDevPreviewRole, setDevPreviewRole } from '@/app/dashboard/dev-preview-role-actions'
import {
  markAllNotificationReads,
  markNotificationRead,
  type DashboardNotificationItem,
} from '@/app/dashboard/actions'

function formatRoleBadgeLabel(role: AppRole): string {
  switch (role) {
    case 'admin':
      return 'ADMIN'
    case 'sales':
      return 'SALES'
    case 'account_manager':
      return 'ACCOUNT MANAGER'
    default:
      return String(role).toUpperCase()
  }
}

export function DashboardHeader({
  userName,
  userEmail,
  userInitials,
  userRole,
  initialNotifications = [],
}: {
  userName: string
  userEmail: string
  userInitials: string
  userRole: AppRole
  initialNotifications?: DashboardNotificationItem[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { setOpen } = useCommandPalette()
  const [roleSwitchPending, startRoleSwitch] = useTransition()
  const [notifications, setNotifications] =
    useState<DashboardNotificationItem[]>(initialNotifications)

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const [markNotificationsPending, startMarkNotifications] = useTransition()

  function markAllNotificationsRead() {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id)
    if (!ids.length) return
    startMarkNotifications(() => {
      void markAllNotificationReads(ids).then((res) => {
        if (res.success) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
      })
    })
  }

  function handleOpenNotification(id: string) {
    startMarkNotifications(() => {
      void markNotificationRead(id).then((res) => {
        if (res.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
      })
    })
  }

  const handleLogout = async () => {
    await clearDevPreviewRole()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(ROUTES.login)
  }

  function selectDevRole(role: AppRole) {
    startRoleSwitch(async () => {
      const res = await setDevPreviewRole(role)
      if (!res.ok) {
        toast.error(res.error ?? 'Rolle konnte nicht gesetzt werden.')
        return
      }
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
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
          <div className="text-2xl font-semibold tracking-tight truncate">{headerMeta.title}</div>
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
          variant="ghost"
          size="icon"
          aria-label="Suche öffnen (⌘K)"
          title="Suche (⌘K)"
          onClick={() => setOpen(true)}
        >
          <AppIcon icon={SearchIcon} size={20} />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted/60 transition-colors"
              aria-label="Benachrichtigungen"
            >
              <AppIcon icon={Bell} size={20} />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <h3 className="text-sm font-semibold">{COPY.notifications.title}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={unreadCount === 0 || markNotificationsPending}
                aria-label={COPY.notifications.markAllReadAria}
                title={COPY.notifications.markAllReadAria}
                onClick={markAllNotificationsRead}
              >
                <AppIcon icon={MailOpen} size={18} />
              </Button>
            </div>
            <div className="max-h-80 overflow-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Keine Benachrichtigungen.
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-2 border-b px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={notification.href}
                        onClick={() => handleOpenNotification(notification.id)}
                        className={cn(
                          'inline-block max-w-full truncate rounded-sm text-sm font-medium text-foreground underline-offset-2 transition-colors',
                          'hover:text-primary hover:underline',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                        )}
                      >
                        {notification.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{notification.text}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{notification.time}</p>
                    </div>
                    {!notification.read ? (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-sidebar-primary"
                        title={COPY.notifications.unreadBadgeAria}
                        aria-label={COPY.notifications.unreadBadgeAria}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-6 w-px shrink-0 bg-border/80" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 gap-2 px-2 font-normal hover:bg-muted/60"
              aria-label="Profilmenü"
            >
              <span className="hidden max-w-[160px] truncate text-left text-sm font-medium sm:inline">
                {userName}
              </span>
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="size-4 shrink-0" aria-hidden />
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
                  <span
                    className={cn(
                      'mt-1 inline-flex w-fit rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground'
                    )}
                  >
                    {formatRoleBadgeLabel(userRole)}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {COPY.roleSwitcher.profileMenuSectionTitle}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={roleSwitchPending}
              onSelect={() => selectDevRole('admin')}
              className={cn('cursor-pointer', userRole === 'admin' && 'bg-accent font-medium')}
            >
              <AppIcon icon={Shield} size={16} className="shrink-0" />
              {COPY.roleSwitcher.roleMarketingAdmin}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={roleSwitchPending}
              onSelect={() => selectDevRole('account_manager')}
              className={cn(
                'cursor-pointer',
                userRole === 'account_manager' && 'bg-accent font-medium'
              )}
            >
              <AppIcon icon={UserIcon} size={16} className="shrink-0" />
              {COPY.roleSwitcher.roleAccountManager}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={roleSwitchPending}
              onSelect={() => selectDevRole('sales')}
              className={cn('cursor-pointer', userRole === 'sales' && 'bg-accent font-medium')}
            >
              <AppIcon icon={Briefcase} size={16} className="shrink-0" />
              {COPY.roleSwitcher.roleSalesRep}
            </DropdownMenuItem>
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
