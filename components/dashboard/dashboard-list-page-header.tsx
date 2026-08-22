'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from '@/lib/dashboard-ui'
import {
  getDashboardListPageMeta,
  shouldShowDashboardListPageHeader,
} from '@/lib/dashboard-list-page-meta'
import { loadReferenceLibraryModeFromStorage } from '@/lib/references/library/reference-library-mode'
import {
  syncReferenceLibraryModeFromStorage,
  useReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode-store'
import { ROUTES } from '@/lib/routes'

export function DashboardListPageHeader() {
  const pathname = usePathname()
  const referenceLibraryMode = useReferenceLibraryMode()

  useEffect(() => {
    if (pathname === ROUTES.references.root) {
      syncReferenceLibraryModeFromStorage(loadReferenceLibraryModeFromStorage())
    }
  }, [pathname])

  if (!shouldShowDashboardListPageHeader(pathname)) return null

  const meta = getDashboardListPageMeta(pathname, {
    referenceLibraryMode,
  })
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
