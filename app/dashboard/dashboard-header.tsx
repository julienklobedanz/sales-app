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

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string | null>(null)

  const pathSegments = pathname?.split('/').filter(Boolean) || []
  const isCompanyDetail =
    pathSegments.length === 3 &&
    pathSegments[0] === 'dashboard' &&
    pathSegments[1] === 'accounts'
  const isCompaniesRoot =
    pathSegments.length === 2 &&
    pathSegments[0] === 'dashboard' &&
    pathSegments[1] === 'accounts'

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
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

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
                    onClick={() => router.push('/dashboard/accounts')}
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

      <div className="flex items-center shrink-0 ml-auto" />
    </header>
  )
}
