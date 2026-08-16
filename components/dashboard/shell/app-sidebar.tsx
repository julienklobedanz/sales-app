'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Handshake } from 'lucide-react'
import {
  Building2,
  FileText,
  GalleryHorizontalEndIcon,
  HeadsetIcon,
  Search01Icon,
  Send,
  SettingsIcon,
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
import type { SidebarDealNavItem } from '@/lib/deals/list-my-sidebar-deals'
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

function SidebarIconButton({
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
    'shell-sidebar-icon-btn',
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

function CommandSearch({ collapsed }: { collapsed: boolean }) {
  const { setOpen } = useCommandPalette()

  if (collapsed) {
    return (
      <SidebarIconButton label="Suchen" onClick={() => setOpen(true)}>
        <AppIcon icon={Search01Icon} size={16} className="shrink-0 opacity-70" />
      </SidebarIconButton>
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

function DealsNavSection({
  collapsed,
  pathname,
  mySidebarDeals,
}: {
  collapsed: boolean
  pathname: string | null
  mySidebarDeals: SidebarDealNavItem[]
}) {
  const dealsActive = Boolean(pathname?.startsWith(ROUTES.deals.root))
  const [open, setOpen] = useState(dealsActive)
  const [wasDealsActive, setWasDealsActive] = useState(dealsActive)
  if (dealsActive !== wasDealsActive) {
    setWasDealsActive(dealsActive)
    if (dealsActive) setOpen(true)
  }

  const dealsIcon = (
    <Handshake className="size-4 shrink-0" strokeWidth={dealsActive ? 2.5 : 2} />
  )

  if (collapsed) {
    return (
      <Link
        href={ROUTES.deals.root}
        data-active={dealsActive}
        title={COPY.nav.deals}
        className={cn('shell-nav-item', 'justify-center px-0')}
      >
        {dealsIcon}
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href={ROUTES.deals.root}
          data-active={dealsActive}
          className="shell-nav-item min-w-0 flex-1"
        >
          {dealsIcon}
          <span className="truncate">{COPY.nav.deals}</span>
        </Link>
        <button
          type="button"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground',
            'hover:bg-muted/70 hover:text-foreground',
          )}
          aria-expanded={open}
          aria-label={open ? COPY.nav.dealsCollapseAria : COPY.nav.dealsExpandAria}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen((v) => !v)
          }}
        >
          <ChevronDown
            className={cn('size-4 transition-transform duration-150', open && 'rotate-180')}
          />
        </button>
      </div>

      {open ? (
        <ul className="ml-3 space-y-0.5 border-l border-border/60 py-0.5 pl-2">
          {mySidebarDeals.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">{COPY.nav.dealsMineEmpty}</li>
          ) : (
            mySidebarDeals.map((deal) => {
              const active = pathname === deal.href
              return (
                <li key={deal.id}>
                  <Link
                    href={deal.href}
                    data-active={active}
                    className={cn(
                      'shell-nav-subitem',
                      active && 'shell-nav-subitem-active',
                    )}
                    title={
                      deal.companyName ? `${deal.title} · ${deal.companyName}` : deal.title
                    }
                  >
                    <span className="truncate">{deal.title}</span>
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

export function AppSidebar({
  profile,
  userId,
  userName,
  userEmail,
  userInitials,
  initialNotifications,
  mySidebarDeals = [],
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
  mySidebarDeals?: SidebarDealNavItem[]
  devRolePreviewEnabled: boolean
  devRolePreviewActive: boolean
  onSupportOpen: () => void
  onFeedbackOpen: () => void
  forceExpanded?: boolean
}) {
  const pathname = usePathname()
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const collapsed = forceExpanded ? false : state === 'collapsed'

  const homeItem: NavItem = {
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
  }

  const referencesItem: NavItem = {
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
  }

  const accountsItem: NavItem = {
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
  }

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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--shell-nav-active-border)] text-white">
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
          <div className="shell-sidebar-rail mb-2 shrink-0">
            <CommandSearch collapsed />
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
              <CommandSearch collapsed={false} />
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

        <nav className="flex min-h-0 shrink-0 flex-col gap-0.5 overflow-y-auto">
          {[homeItem].map((item) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                title={collapsed ? item.label : undefined}
                className={cn('shell-nav-item', collapsed && 'justify-center px-0')}
              >
                {item.icon}
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            )
          })}

          <DealsNavSection
            collapsed={collapsed}
            pathname={pathname}
            mySidebarDeals={mySidebarDeals}
          />

          {[referencesItem, accountsItem].map((item) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                title={collapsed ? item.label : undefined}
                className={cn('shell-nav-item', collapsed && 'justify-center px-0')}
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
          <div className="shell-sidebar-rail">
            <SidebarIconButton label="Support erhalten" onClick={onSupportOpen}>
              <AppIcon icon={HeadsetIcon} size={16} />
            </SidebarIconButton>
            <SidebarIconButton label="Feedback senden" onClick={onFeedbackOpen}>
              <AppIcon icon={Send} size={16} />
            </SidebarIconButton>
            <SidebarIconButton
              label="Einstellungen"
              href={ROUTES.settings}
              active={Boolean(pathname?.startsWith(ROUTES.settings))}
            >
              <AppIcon icon={SettingsIcon} size={16} />
            </SidebarIconButton>
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
