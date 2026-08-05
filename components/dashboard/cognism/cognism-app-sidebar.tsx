'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Handshake, Radar } from 'lucide-react'
import {
  Building2,
  FileText,
  GalleryHorizontalEndIcon,
  HeadsetIcon,
  Search01Icon,
  Send,
  SettingsIcon,
  Sparkles,
} from '@hugeicons/core-free-icons'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

import { DashboardUserMenu } from '@/components/dashboard/dashboard-user-menu'
import { SidebarNotificationsSection } from '@/components/dashboard/sidebar-notifications-button'
import { Button } from '@/components/ui/button'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import type { DashboardNotificationItem } from '@/app/dashboard/actions'
import type { Profile } from '@/app/dashboard/dashboard-types'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  isActive: (pathname: string | null) => boolean
  icon: ReactNode
}

function CognismSidebarIconButton({
  label,
  children,
  onClick,
  href,
  active = false,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  href?: string
  active?: boolean
}) {
  const className = cn(
    'cognism-sidebar-icon-btn',
    active && 'border-primary/30 bg-muted text-foreground',
  )

  const content = href ? (
    <Link href={href} className={className} aria-label={label} data-active={active}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-label={label}>
      {children}
    </button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function CognismCommandSearch({ collapsed }: { collapsed: boolean }) {
  const { setOpen } = useCommandPalette()

  if (collapsed) {
    return (
      <CognismSidebarIconButton label="Suchen" onClick={() => setOpen(true)}>
        <AppIcon icon={Search01Icon} size={16} className="shrink-0 opacity-70" />
      </CognismSidebarIconButton>
    )
  }

  return (
    <SidebarMenu className="w-full gap-0.5">
      <SidebarMenuItem className="w-full">
        <SidebarMenuButton
          type="button"
          tooltip="Suchen"
          onClick={() => setOpen(true)}
          className={cn(
            'h-9 w-full rounded-lg border border-border/40 bg-muted/45 text-muted-foreground shadow-none',
            'hover:bg-muted/75 hover:text-foreground',
          )}
          aria-label="Globale Suche öffnen"
        >
          <AppIcon icon={Search01Icon} size={16} className="shrink-0 opacity-70" />
          <span className="font-normal">Suchen</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function CognismAppSidebar({
  profile,
  userId,
  userName,
  userEmail,
  userInitials,
  initialNotifications,
  devRolePreviewEnabled,
  devRolePreviewActive,
  onSupportOpen,
  onFeedbackOpen,
  forceExpanded = false,
}: {
  profile: Profile
  userId: string
  userName: string
  userEmail: string
  userInitials: string
  initialNotifications: DashboardNotificationItem[]
  devRolePreviewEnabled: boolean
  devRolePreviewActive: boolean
  onSupportOpen: () => void
  onFeedbackOpen: () => void
  forceExpanded?: boolean
}) {
  const pathname = usePathname()
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const collapsed = forceExpanded ? false : state === 'collapsed'

  const navItems: NavItem[] = [
    {
      href: ROUTES.home,
      label: COPY.pages.dashboard,
      isActive: (p) => p === ROUTES.home,
      icon: (
        <AppIcon
          icon={GalleryHorizontalEndIcon}
          size={16}
          strokeWidth={pathname === ROUTES.home ? 2.5 : 2}
        />
      ),
    },
    {
      href: ROUTES.match,
      label: COPY.nav.match,
      isActive: (p) => Boolean(p?.startsWith(ROUTES.match)),
      icon: (
        <AppIcon
          icon={Sparkles}
          size={16}
          strokeWidth={pathname?.startsWith(ROUTES.match) ? 2.5 : 2}
        />
      ),
    },
    {
      href: ROUTES.marketSignals,
      label: COPY.nav.marketSignals,
      isActive: (p) => Boolean(p?.startsWith(ROUTES.marketSignals)),
      icon: (
        <Radar
          className="size-4 shrink-0"
          strokeWidth={pathname?.startsWith(ROUTES.marketSignals) ? 2.5 : 2}
        />
      ),
    },
    {
      href: ROUTES.references.root,
      label: COPY.nav.references,
      isActive: (p) => Boolean(p?.startsWith(ROUTES.references.root)),
      icon: (
        <AppIcon
          icon={FileText}
          size={16}
          strokeWidth={pathname?.startsWith(ROUTES.references.root) ? 2.5 : 2}
        />
      ),
    },
    {
      href: ROUTES.deals.root,
      label: COPY.nav.deals,
      isActive: (p) => Boolean(p?.startsWith(ROUTES.deals.root)),
      icon: (
        <Handshake
          className="size-4 shrink-0"
          strokeWidth={pathname?.startsWith(ROUTES.deals.root) ? 2.5 : 2}
        />
      ),
    },
    {
      href: ROUTES.accounts,
      label: COPY.nav.accounts,
      isActive: (p) => Boolean(p?.startsWith(ROUTES.accounts)),
      icon: (
        <AppIcon
          icon={Building2}
          size={16}
          strokeWidth={pathname?.startsWith(ROUTES.accounts) ? 2.5 : 2}
        />
      ),
    },
  ]

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsed ? 'icon' : ''}
      className="group peer grid h-full min-h-0 w-full shrink-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-sidebar transition-[width] duration-200 ease-linear"
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border/60',
          collapsed ? 'justify-center px-1' : 'justify-between gap-2 px-3',
        )}
      >
        {!collapsed ? (
          <Link href={ROUTES.home} className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--cognism-nav-active-border)] text-white">
              <AppIcon icon={GalleryHorizontalEndIcon} size={16} strokeWidth={2.5} />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight text-[#2D1B4E]">
              RefStack
            </span>
          </Link>
        ) : null}
        {!forceExpanded ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => (isMobile ? setOpenMobile(true) : toggleSidebar())}
            aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      <div className={cn('flex min-h-0 flex-col py-3', collapsed ? 'px-1' : 'px-2')}>
        {collapsed ? (
          <div className="cognism-sidebar-rail mb-2 shrink-0">
            <CognismCommandSearch collapsed />
            <SidebarNotificationsSection
              userId={userId}
              systemRole={profile.systemRole}
              functionRole={profile.functionRole}
              initialNotifications={initialNotifications}
              layout="rail"
            />
          </div>
        ) : (
          <div className="mb-2 flex shrink-0 items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <CognismCommandSearch collapsed={false} />
            </div>
            <SidebarNotificationsSection
              userId={userId}
              systemRole={profile.systemRole}
              functionRole={profile.functionRole}
              initialNotifications={initialNotifications}
              layout="inline"
            />
          </div>
        )}

        <nav className="flex shrink-0 flex-col gap-0.5">
          {navItems.map((item) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                title={collapsed ? item.label : undefined}
                className={cn('cognism-nav-item', collapsed && 'justify-center px-0')}
              >
                {item.icon}
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={cn('shrink-0 space-y-2 pb-3', collapsed ? 'px-1' : 'px-2')}>
        {collapsed ? (
          <div className="cognism-sidebar-rail">
            <CognismSidebarIconButton label="Support erhalten" onClick={onSupportOpen}>
              <AppIcon icon={HeadsetIcon} size={16} />
            </CognismSidebarIconButton>
            <CognismSidebarIconButton label="Feedback senden" onClick={onFeedbackOpen}>
              <AppIcon icon={Send} size={16} />
            </CognismSidebarIconButton>
            <CognismSidebarIconButton
              label="Einstellungen"
              href={ROUTES.settings}
              active={Boolean(pathname?.startsWith(ROUTES.settings))}
            >
              <AppIcon icon={SettingsIcon} size={16} />
            </CognismSidebarIconButton>
            <DashboardUserMenu
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              devRolePreviewEnabled={devRolePreviewEnabled}
              devRolePreviewActive={devRolePreviewActive}
              compact
            />
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex w-full gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onSupportOpen}
                    className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60"
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
                    onClick={onFeedbackOpen}
                    className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60"
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
                      'flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60',
                      pathname?.startsWith(ROUTES.settings) &&
                        'border-primary/30 bg-muted text-foreground',
                    )}
                    aria-label="Einstellungen"
                  >
                    <AppIcon icon={SettingsIcon} size={16} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">Einstellungen</TooltipContent>
              </Tooltip>
            </div>

            <DashboardUserMenu
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              devRolePreviewEnabled={devRolePreviewEnabled}
              devRolePreviewActive={devRolePreviewActive}
            />
          </>
        )}
      </div>
    </aside>
  )
}
