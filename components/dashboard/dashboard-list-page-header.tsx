'use client'

import { usePathname } from 'next/navigation'

import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from '@/lib/dashboard-ui'
import {
  getDashboardListPageMeta,
  shouldShowDashboardListPageHeader,
} from '@/lib/dashboard-list-page-meta'

export function DashboardListPageHeader() {
  const pathname = usePathname()

  if (!shouldShowDashboardListPageHeader(pathname)) return null

  const meta = getDashboardListPageMeta(pathname)
  if (!meta) return null

  return (
    <header className="mb-1">
      <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>{meta.title}</h1>
      {meta.subtitle ? (
        <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>{meta.subtitle}</p>
      ) : null}
    </header>
  )
}
