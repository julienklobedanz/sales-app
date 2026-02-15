'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SlashIcon } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()

  // Breadcrumbs Logik
  const pathSegments = pathname?.split('/').filter(Boolean) || []

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
          {pathSegments.slice(1).map((segment) => (
            <div key={segment} className="flex items-center">
              <SlashIcon className="mx-2 size-3 text-muted-foreground/50" />
              <span className="capitalize text-foreground">{segment}</span>
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}
