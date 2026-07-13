'use client'

import { useEffect, useMemo, useState } from 'react'
import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { createClient } from '@/lib/supabase/client'
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

export function DashboardHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accountsListView = useAccountsListView()
  const referenceLibraryMode = useReferenceLibraryMode()

  useEffect(() => {
    syncAccountsListViewFromUrl(parseAccountsListView(searchParams))
  }, [searchParams])

  useEffect(() => {
    if (pathname === ROUTES.references.root) {
      syncReferenceLibraryModeFromStorage(loadReferenceLibraryModeFromStorage())
    }
  }, [pathname])

  const [dynamicCrumbs, setDynamicCrumbs] = useState<Array<{ label: string; href?: string }>>([])
  const [accountCrumbNames, setAccountCrumbNames] = useState<Record<string, string>>({})
  const [dealCrumbTitles, setDealCrumbTitles] = useState<Record<string, string>>({})

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
      try {
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
            { label: COPY.nav.marketSignals, href: ROUTES.marketSignals },
            { label: 'Watchlist verwalten' },
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
      } catch {
        if (!cancelled) setDynamicCrumbs([])
      }
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
    </header>
  )
}
