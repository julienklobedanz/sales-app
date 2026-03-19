'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SlashIcon, Bell, ExternalLink } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { getAlerts, getUnreadAlertCount, markAlertsRead } from '@/app/dashboard/ai-lab/actions'

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string | null>(null)

  const pathSegments = pathname?.split('/').filter(Boolean) || []
  const isCompanyDetail =
    pathSegments.length === 3 &&
    pathSegments[0] === 'dashboard' &&
    pathSegments[1] === 'companies'
  const isCompaniesRoot =
    pathSegments.length === 2 &&
    pathSegments[0] === 'dashboard' &&
    pathSegments[1] === 'companies'

  const companyId = isCompanyDetail ? pathSegments[2] : null

  const supabase = useMemo(() => (isCompanyDetail ? createClient() : null), [isCompanyDetail])

  useEffect(() => {
    if (!isCompanyDetail || !companyId || !supabase) {
      setCompanyName(null)
      return
    }

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

  const breadcrumbSegments = (() => {
    if (!pathname) return []
    if (isCompanyDetail || isCompaniesRoot) {
      return ['client-intelligence'] // Label → "Accounts"
    }
    if (pathname === '/dashboard') {
      return ['success-stories']
    }
    return pathSegments.slice(1)
  })()

  const breadcrumbLabel = (segment: string) => {
    if (segment === 'client-intelligence') return 'Accounts'
    if (segment === 'success-stories') return 'Success Stories'
    if (segment === 'ai-lab') return 'AI Lab'
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  const [unreadCount, setUnreadCount] = useState(0)
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof getAlerts>>>([])
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    getUnreadAlertCount().then(setUnreadCount)
  }, [pathname])

  useEffect(() => {
    if (popoverOpen) {
      getAlerts(20).then((list) => {
        setAlerts(list)
        const unreadIds = list.slice(0, 20).map((a) => a.id)
        if (unreadIds.length) markAlertsRead(unreadIds).then(() => getUnreadAlertCount().then(setUnreadCount))
      })
    }
  }, [popoverOpen])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />

        <nav className="flex items-center text-sm font-medium text-muted-foreground min-w-0">
          <button
            type="button"
            className="hover:text-foreground transition-colors shrink-0"
            onClick={() => router.push('/dashboard')}
          >
            Refstack
          </button>
          {breadcrumbSegments.map((segment) => {
            const isAccounts = segment === 'client-intelligence'
            const label = breadcrumbLabel(segment)
            const isClickable = isAccounts
            return (
              <div key={segment} className="flex items-center shrink-0">
                <SlashIcon className="mx-2 size-3 text-muted-foreground/50" />
                {isClickable ? (
                  <button
                    type="button"
                    className="text-foreground hover:underline"
                    onClick={() => router.push(isAccounts ? '/dashboard/companies' : '/dashboard/ai-lab')}
                  >
                    {label}
                  </button>
                ) : (
                  <span className="text-foreground">{label}</span>
                )}
              </div>
            )
          })}
          {isCompanyDetail && companyName && (
            <div className="flex items-center shrink-0">
              <SlashIcon className="mx-2 size-3 text-muted-foreground/50" />
              <span className="text-foreground truncate max-w-[200px] sm:max-w-xs">
                {companyName}
              </span>
            </div>
          )}
        </nav>
      </div>

      <div className="flex items-center shrink-0 ml-auto">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Benachrichtigungen"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] max-h-[420px] overflow-y-auto p-0" align="end">
            <div className="p-2 border-b">
              <p className="font-semibold text-sm">High-Impact Alerts</p>
              <p className="text-xs text-muted-foreground">Executive-Wechsel, Firmen-News und mehr</p>
            </div>
            <ul className="divide-y max-h-[360px] overflow-y-auto">
              {alerts.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground text-center">
                  Keine neuen Benachrichtigungen.
                </li>
              )}
              {alerts.map((a) => (
                <li key={a.id} className="p-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">{a.title}</p>
                    {a.body && <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {a.company_id && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            router.push(`/dashboard/companies/${a.company_id}`)
                            setPopoverOpen(false)
                          }}
                        >
                          → {a.company_name || 'Account'}
                        </button>
                      )}
                      {a.source_url && (
                        <a
                          href={a.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Quelle <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
