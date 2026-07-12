'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Bell,
  MailOpen,
  SearchIcon,
} from '@hugeicons/core-free-icons'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useHydrated } from '@/hooks/use-hydrated'
import { type AppRole } from '@/hooks/useRole'
import { createClient } from '@/lib/supabase/client'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'
import {
  accountsDetailHref,
  accountsListHref,
  accountsListTitle,
  parseAccountsListView,
} from '@/lib/accounts/accounts-list-view'
import {
  syncAccountsListViewFromUrl,
  useAccountsListView,
} from '@/lib/accounts/accounts-list-view-store'
import {
  referenceLibraryTitle,
  loadReferenceLibraryModeFromStorage,
} from '@/lib/references/library/reference-library-mode'
import {
  syncReferenceLibraryModeFromStorage,
  useReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode-store'
import { ROUTES } from '@/lib/routes'
import {
  getInboxNotificationsForLayout,
  markAllNotificationReads,
  markNotificationRead,
  type DashboardNotificationItem,
} from '@/app/dashboard/actions'

const INBOX_POLL_MS = 120_000

export function DashboardHeader({
  userId,
  userRole,
  initialNotifications = [],
}: {
  userId: string
  userRole: AppRole
  initialNotifications?: DashboardNotificationItem[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accountsListView = useAccountsListView()
  const referenceLibraryMode = useReferenceLibraryMode()

  const hydrated = useHydrated()

  useEffect(() => {
    syncAccountsListViewFromUrl(parseAccountsListView(searchParams))
  }, [searchParams])

  useEffect(() => {
    if (pathname === ROUTES.references.root) {
      syncReferenceLibraryModeFromStorage(loadReferenceLibraryModeFromStorage())
    }
  }, [pathname])

  const { setOpen } = useCommandPalette()
  const [notifications, setNotifications] =
    useState<DashboardNotificationItem[]>(initialNotifications)
  const [dynamicCrumbs, setDynamicCrumbs] = useState<Array<{ label: string; href?: string }>>([])
  const [accountCrumbNames, setAccountCrumbNames] = useState<Record<string, string>>({})
  const [dealCrumbTitles, setDealCrumbTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  useEffect(() => {
    async function refreshInbox() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const next = await getInboxNotificationsForLayout(userId, userRole)
        setNotifications(next)
      } catch {
        // offline / transient — keep current list
      }
    }

    const id = window.setInterval(refreshInbox, INBOX_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshInbox()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [userId, userRole])

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

  const headerMeta = useMemo(() => {
    if (!pathname) return { title: COPY.pages.dashboard, subtitle: undefined as string | undefined }

    if (pathname === ROUTES.home) {
      return {
        title: COPY.pages.dashboard,
        subtitle: undefined,
      }
    }
    if (pathname.startsWith(ROUTES.references.root)) {
      return {
        title:
          pathname === ROUTES.references.root
            ? referenceLibraryTitle(referenceLibraryMode)
            : COPY.pages.references,
        subtitle: undefined,
      }
    }
    if (pathname.startsWith(ROUTES.accounts)) {
      return {
        title: accountsListTitle(accountsListView),
        subtitle: undefined,
      }
    }
    if (pathname.startsWith(ROUTES.deals.root)) {
      return {
        title: 'Deals',
        subtitle: undefined,
      }
    }
    if (pathname.startsWith(ROUTES.match)) {
      return {
        title: COPY.pages.match,
        subtitle: undefined,
      }
    }
    if (pathname.startsWith(ROUTES.marketSignals)) {
      return {
        title: COPY.nav.marketSignals,
        subtitle: COPY.marketSignals.pageSubtitle,
      }
    }
    if (pathname.startsWith(ROUTES.insights)) {
      return {
        title: COPY.nav.insights,
        subtitle: 'Nutzung, Adoption und Win-Rate',
      }
    }
    if (pathname.startsWith(ROUTES.marketSignalsManage)) {
      return {
        title: 'Marktsignale verwalten',
        subtitle: 'Watchlist & Stakeholder-Überwachung',
      }
    }
    if (pathname.startsWith(ROUTES.dealDesk)) {
      return {
        title: COPY.pages.dealDesk,
        subtitle: undefined,
      }
    }
    if (pathname.startsWith(ROUTES.settings)) {
      return {
        title: 'Einstellungen',
        subtitle: undefined,
      }
    }
    return {
      title: COPY.pages.dashboard,
      subtitle: undefined,
    }
  }, [pathname, accountsListView, referenceLibraryMode])
  const hasHeaderSecondaryLine = dynamicCrumbs.length > 0 || Boolean(headerMeta.subtitle)

  useEffect(() => {
    let cancelled = false
    async function resolveCrumbs() {
      if (!pathname) {
        if (!cancelled) setDynamicCrumbs([])
        return
      }

      if (pathname === ROUTES.accounts || pathname === ROUTES.references.root) {
        if (!cancelled) setDynamicCrumbs([])
        return
      }

      if (pathname === ROUTES.deals.new) {
        if (!cancelled) {
          setDynamicCrumbs([
            { label: 'Deals', href: ROUTES.deals.root },
            { label: 'Neuer Deal' },
          ])
        }
        return
      }

      if (pathname === ROUTES.deals.requestNew) {
        if (!cancelled) {
          setDynamicCrumbs([
            { label: 'Deals', href: ROUTES.deals.root },
            { label: 'Anfrage erstellen' },
          ])
        }
        return
      }

      if (pathname === ROUTES.marketSignalsManage) {
        if (!cancelled) {
          setDynamicCrumbs([
            { label: 'Einstellungen', href: ROUTES.settings },
            { label: 'Marktsignale verwalten' },
          ])
        }
        return
      }

      if (pathname === ROUTES.settings) {
        const tab = searchParams.get('tab')
        const tabLabel =
          tab === 'workspace'
            ? 'Workspace'
            : tab === 'team'
              ? 'Team'
              : tab === 'integrations'
                ? 'Integrationen'
                : tab === 'workflow'
                  ? 'Workflow'
                  : tab === 'profile'
                    ? 'Profil'
                    : null
        if (!tabLabel) {
          if (!cancelled) setDynamicCrumbs([])
          return
        }
        if (!cancelled) {
          setDynamicCrumbs([
            { label: 'Einstellungen', href: ROUTES.settings },
            { label: tabLabel },
          ])
        }
        return
      }

      const accountMatch = pathname.match(/^\/dashboard\/accounts\/([^/]+)$/)
      if (accountMatch) {
        const id = accountMatch[1]
        const tab = searchParams.get('tab') ?? 'strategy'
        const tabLabel =
          tab === 'stakeholders'
            ? 'Stakeholder'
            : tab === 'contacts'
              ? 'Kontakte'
              : tab === 'links'
                ? 'Referenzen & Deals'
                : 'Strategie'
        const fallbackName = accountCrumbNames[id] ?? 'Account'
        const supabase = createClient()
        const { data } = await supabase
          .from('companies')
          .select('name, entity_kind')
          .eq('id', id)
          .maybeSingle()
        const listView =
          (data as { entity_kind?: string } | null)?.entity_kind === 'partner'
            ? 'partner'
            : parseAccountsListView(searchParams)
        const listLabel = accountsListTitle(listView)
        const listHref = accountsListHref(listView)
        if (!cancelled) {
          if (data?.name) {
            setAccountCrumbNames((prev) => ({ ...prev, [id]: data.name as string }))
          }
          setDynamicCrumbs([
            { label: listLabel, href: listHref },
            {
              label: data?.name ?? fallbackName,
              href: accountsDetailHref(id, listView),
            },
            { label: tabLabel },
          ])
        }
        return
      }

      const dealMatch = pathname.match(/^\/dashboard\/deals\/([^/]+)$/)
      if (dealMatch) {
        const id = dealMatch[1]
        const fallbackTitle = dealCrumbTitles[id] ?? 'Deal'
        if (!cancelled) {
          setDynamicCrumbs([
            { label: 'Deals', href: ROUTES.deals.root },
            { label: fallbackTitle },
          ])
        }
        if (dealCrumbTitles[id]) return
        const supabase = createClient()
        const { data } = await supabase.from('deals').select('title').eq('id', id).maybeSingle()
        if (!cancelled) {
          if (data?.title) {
            setDealCrumbTitles((prev) => ({ ...prev, [id]: data.title as string }))
          }
          setDynamicCrumbs([
            { label: 'Deals', href: ROUTES.deals.root },
            { label: data?.title ?? fallbackTitle },
          ])
        }
        return
      }

      const referenceMatch = pathname.match(/^\/dashboard\/evidence\/([^/]+)$/)
      if (referenceMatch) {
        const id = referenceMatch[1]
        const supabase = createClient()
        const { data } = await supabase
          .from('references')
          .select('title, company_id, companies(name)')
          .eq('id', id)
          .maybeSingle()
        const company = Array.isArray(data?.companies) ? data?.companies[0] : data?.companies
        const companyId = typeof data?.company_id === 'string' ? data.company_id : null
        if (!cancelled) {
          setDynamicCrumbs([
            { label: COPY.pages.references, href: ROUTES.references.root },
            { label: company?.name ?? 'Account', href: companyId ? ROUTES.accountsDetail(companyId) : ROUTES.accounts },
            { label: data?.title ?? 'Referenz' },
          ])
        }
        return
      }

      if (!cancelled) setDynamicCrumbs([])
    }
    void resolveCrumbs()
    return () => {
      cancelled = true
    }
  }, [pathname, searchParams, accountCrumbNames, dealCrumbTitles])

  return (
    <header className="flex min-h-[84px] shrink-0 items-center gap-2 border-b px-4 py-3 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:py-2">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0 md:hidden" aria-label="Menü öffnen" />
        <SidebarTrigger className="-ml-1 shrink-0 hidden md:inline-flex" aria-label="Sidebar ein-/ausklappen" />
        {hasHeaderSecondaryLine ? (
          <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
        ) : null}

        <div
          className={cn(
            "flex min-w-0 flex-col justify-center py-0.5",
            hasHeaderSecondaryLine ? "" : "pl-0"
          )}
        >
          <div className="text-2xl font-semibold tracking-tight truncate">{headerMeta.title}</div>
          {hasHeaderSecondaryLine ? (
            <div className="mt-1.5 min-h-5">
              {dynamicCrumbs.length ? (
                <Breadcrumb>
                  <BreadcrumbList>
                    {dynamicCrumbs.map((crumb, idx) => (
                      <Fragment key={`${crumb.label}-${idx}`}>
                        <BreadcrumbItem>
                          {idx === dynamicCrumbs.length - 1 ? (
                            <BreadcrumbPage className="text-slate-900 dark:text-slate-100 font-medium">
                              {crumb.label}
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild className="text-slate-400 hover:text-slate-500">
                              <Link href={crumb.href ?? ROUTES.home}>{crumb.label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {idx < dynamicCrumbs.length - 1 ? (
                          <BreadcrumbSeparator className="text-slate-300" />
                        ) : null}
                      </Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              ) : headerMeta.subtitle ? (
                <div className="text-sm text-muted-foreground truncate">
                  {headerMeta.subtitle}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-md outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Globale Suche öffnen"
          title="Globale Suche"
          onClick={() => setOpen(true)}
        >
          <AppIcon icon={SearchIcon} size={20} />
        </button>

        {hydrated ? (
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
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={4}
              className="w-96 p-0"
            >
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
              <div className="max-h-[28rem] overflow-auto">
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
        ) : (
          <button
            type="button"
            className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted/60 transition-colors"
            aria-label="Benachrichtigungen"
            tabIndex={-1}
          >
            <AppIcon icon={Bell} size={20} />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
        )}
      </div>
    </header>
  )
}
