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
    pathSegments.length >= 4 &&
    pathSegments[1] === 'dashboard' &&
    pathSegments[2] === 'companies'

  const companyId = isCompanyDetail ? pathSegments[3] : null

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
    // Immer "dashboard" selbst ausblenden – Einstieg ist Refstack-Button
    const segments = pathSegments.slice(2) // ab Ebene nach /dashboard
    if (isCompanyDetail) {
      // Für /dashboard/companies/[id] nur "companies" als Segment – Name kommt extra
      return ['companies']
    }
    return segments
  })()

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
          {breadcrumbSegments.map((segment) => (
            <div key={segment} className="flex items-center">
              <SlashIcon className="mx-2 size-3 text-muted-foreground/50" />
              <span className="capitalize text-foreground">
                {segment === 'companies' ? 'Companies' : segment}
              </span>
            </div>
          ))}
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
