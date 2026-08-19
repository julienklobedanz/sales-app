'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import {
  ShowcaseManageInsightBar,
  type ManageInsightSummary,
} from '@/app/p/[slug]/showcase-manage-insight-bar'

type CaseDataItem = {
  label: string
  value: ReactNode
  icon?: ReactNode
}

const BAR_SHELL_CLASS = 'w-full overflow-hidden transition-all duration-300'

const BAR_BODY_CLASS = 'w-full bg-card px-5 py-3.5'

function CaseDataGrid({ items, compact }: { items: CaseDataItem[]; compact?: boolean }) {
  return (
    <div
      className={cn(
        'grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3',
        'xl:grid-cols-5',
        compact && 'xl:gap-x-3',
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {item.icon ? (
              <span className="shrink-0 text-muted-foreground/80">{item.icon}</span>
            ) : null}
            <span className="min-w-0 truncate tabular-nums">{item.value}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function ApprovalCaseDataBar({
  items,
  referenceTitle,
  revokeMode = false,
  prospectPreviewHref = null,
  manageInsights = null,
}: {
  items: CaseDataItem[]
  referenceTitle: string
  /** Sperr-Link-Ansicht: Info-Banner über der Metadaten-Leiste */
  revokeMode?: boolean
  prospectPreviewHref?: string | null
  manageInsights?: ManageInsightSummary | null
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const updatePinned = useCallback((entry: IntersectionObserverEntry) => {
    setIsPinned(!entry.isIntersecting)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => updatePinned(entry), {
      threshold: 0,
      rootMargin: '-1px 0px 0px 0px',
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [updatePinned])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isGlass = isPinned && isScrolled

  const barContent = (floating: boolean) => (
    <div
      className={cn(
        floating && 'flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5',
      )}
    >
      {floating ? (
        <p
          className="shrink-0 text-sm font-semibold text-foreground lg:max-w-[11rem] lg:border-r lg:border-border/50 lg:pr-5"
          title={referenceTitle}
        >
          <span className="line-clamp-2">{referenceTitle}</span>
        </p>
      ) : null}
      <CaseDataGrid items={items} compact={floating} />
    </div>
  )

  const renderBarShell = (floating: boolean) => (
    <Card
      className={cn(
        BAR_SHELL_CLASS,
        'p-0 gap-0',
        isGlass &&
          'border-border/60 bg-background/95 shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-background/90',
      )}
    >
      {revokeMode ? (
        <div
          className={cn(
            'flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-600 dark:text-amber-400',
            isGlass && 'bg-amber-500/20 supports-[backdrop-filter]:bg-amber-500/25',
          )}
        >
          <span>
            🔒 Verwaltungs-Ansicht — Zugriff jederzeit über den roten Button widerrufbar.
          </span>
          {prospectPreviewHref ? (
            <>
              <span className="text-amber-500/50" aria-hidden>
                ·
              </span>
              <Link
                href={prospectPreviewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200"
              >
                So sehen Empfänger Ihre Referenz
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
      {revokeMode && manageInsights ? (
        <ShowcaseManageInsightBar insights={manageInsights} />
      ) : null}
      <div
        className={cn(
          BAR_BODY_CLASS,
          isGlass && 'bg-background/80 supports-[backdrop-filter]:bg-background/75',
        )}
      >
        {barContent(floating)}
      </div>
    </Card>
  )

  return (
    <div className="mb-10">
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {isPinned ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 w-full px-4 pt-4">
          <div className="pointer-events-auto mx-auto w-full max-w-7xl">
            {renderBarShell(true)}
          </div>
        </div>
      ) : null}

      <div
        ref={barRef}
        className={cn(isPinned && 'pointer-events-none invisible')}
        aria-hidden={isPinned}
      >
        {renderBarShell(false)}
      </div>
    </div>
  )
}
