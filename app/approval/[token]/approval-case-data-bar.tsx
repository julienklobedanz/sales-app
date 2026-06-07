'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type CaseDataItem = {
  label: string
  value: string
  icon?: ReactNode
}

const BAR_SURFACE_CLASS =
  'w-full rounded-2xl border border-border bg-card px-5 py-3.5 shadow-sm transition-all duration-300'

function CaseDataGrid({ items, compact }: { items: CaseDataItem[]; compact?: boolean }) {
  return (
    <div
      className={cn(
        'grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3',
        'xl:grid-cols-5',
        compact && 'xl:gap-x-3'
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
            title={item.value}
          >
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
}: {
  items: CaseDataItem[]
  referenceTitle: string
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
    <div className={cn(floating && 'flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5')}>
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

  return (
    <div className="mb-10">
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {isPinned ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 w-full px-4 pt-4">
          <div className="pointer-events-auto mx-auto w-full max-w-7xl">
            <div
              className={cn(
                BAR_SURFACE_CLASS,
                isGlass &&
                  'border-border/50 bg-background/80 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80'
              )}
            >
              {barContent(true)}
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={barRef}
        className={cn(BAR_SURFACE_CLASS, isPinned && 'pointer-events-none invisible')}
        aria-hidden={isPinned}
      >
        {barContent(false)}
      </div>
    </div>
  )
}
