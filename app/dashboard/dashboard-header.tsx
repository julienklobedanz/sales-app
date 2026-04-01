'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, SearchIcon } from '@hugeicons/core-free-icons'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { createClient } from '@/lib/supabase/client'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export function DashboardHeader() {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string | null>(null)
  const { setOpen } = useCommandPalette()

  const pathSegments = pathname?.split('/').filter(Boolean) || []
  const isCompanyDetail =
    pathSegments.length === 3 &&
    pathSegments[0] === 'dashboard' &&
    pathSegments[1] === 'accounts'

  const companyId = isCompanyDetail ? pathSegments[2] : null

  const supabase = useMemo(() => (isCompanyDetail ? createClient() : null), [isCompanyDetail])

  useEffect(() => {
    if (!isCompanyDetail || !companyId || !supabase) return

    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .maybeSingle()
      if (!cancelled) {
        setCompanyName(data?.name ?? null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isCompanyDetail, companyId, supabase])

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
          <div className="text-2xl font-bold tracking-tight truncate">
            {isCompanyDetail && companyName ? companyName : headerMeta.title}
          </div>
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
      </div>
    </header>
  )
}
