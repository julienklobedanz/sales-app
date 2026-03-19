'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SlashIcon } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

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
    return pathSegments.slice(1)
  })()

  const breadcrumbLabel = (segment: string) => {
    if (segment === 'client-intelligence') return 'Accounts'
    if (segment === 'ai-lab') return 'AI Lab'
    return segment.charAt(0).toUpperCase() + segment.slice(1)
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />

        <nav className="flex items-center text-sm font-medium text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground transition-colors"
            onClick={() => router.push('/dashboard')}
          >
            Refstack
          </button>
          {breadcrumbSegments.map((segment) => {
            const isAccounts = segment === 'client-intelligence'
            const label = breadcrumbLabel(segment)
            const isClickable = isAccounts
            return (
              <div key={segment} className="flex items-center">
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
            <div className="flex items-center">
              <SlashIcon className="mx-2 size-3 text-muted-foreground/50" />
              <span className="text-foreground truncate max-w-[200px] sm:max-w-xs">
                {companyName}
              </span>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
