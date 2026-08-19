'use client'

import Image from 'next/image'
import Link from 'next/link'
import { forwardRef, useEffect, useMemo, useState, useTransition } from 'react'
import { Bell, Building2, ExternalLink, MailOpen } from '@hugeicons/core-free-icons'

import {
  getInboxNotificationsForLayout,
  markAllNotificationReads,
  markNotificationRead,
  type DashboardNotificationItem,
} from '@/app/dashboard/actions'
import type { NotificationInboxGroup } from '@/app/dashboard/notifications/inbox'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useHydrated } from '@/hooks/use-hydrated'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'

const INBOX_POLL_MS = 120_000

const triggerClassName =
  'relative flex items-center justify-center rounded-xl border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function typeChipClass(kind: DashboardNotificationItem['typeKind']) {
  if (kind === 'move') return 'bg-blue-600/10 text-blue-700 border-0'
  if (kind === 'executive') return 'bg-primary/10 text-primary border-0'
  if (kind === 'company') return 'bg-muted text-foreground border-0'
  if (kind === 'approval')
    return 'bg-emerald-600/10 text-emerald-700 border-0'
  if (kind === 'nda') return 'bg-amber-600/10 text-amber-800 border-0'
  return 'bg-muted text-muted-foreground border-0'
}

const NotificationTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    unreadCount: number
    compact?: boolean
    rail?: boolean
  }
>(function NotificationTrigger(
  { unreadCount, compact = false, rail = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        rail ? 'shell-sidebar-icon-btn' : triggerClassName,
        compact &&
          !rail &&
          'size-9 shrink-0 rounded-lg border-border/40 bg-muted/45 shadow-none hover:bg-muted/75',
        !compact && !rail && 'h-9 w-full',
        className,
      )}
      aria-label="Benachrichtigungen"
      {...props}
    >
      <AppIcon icon={Bell} size={16} />
      {unreadCount > 0 ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-destructive font-bold text-destructive-foreground',
            compact
              ? 'h-3.5 min-w-3.5 px-0.5 text-[9px]'
              : 'h-4 min-w-4 px-1 text-[10px]',
          )}
        >
          {compact && unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  )
})

function NotificationLogo({
  logoUrl,
  companyName,
}: {
  logoUrl: string | null
  companyName: string | null
}) {
  const initials = (companyName || '?').slice(0, 2).toUpperCase()
  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40">
      {logoUrl ? (
        <Image src={logoUrl} alt="" fill sizes="36px" className="object-contain p-1" />
      ) : companyName ? (
        <span className="text-[10px] font-semibold text-muted-foreground">
          {initials}
        </span>
      ) : (
        <AppIcon icon={Building2} size={14} className="text-muted-foreground" />
      )}
    </div>
  )
}

function NotificationsPopover({
  unreadCount,
  notifications,
  markNotificationsPending,
  onMarkAllRead,
  onOpenNotification,
  compact = false,
  rail = false,
}: {
  unreadCount: number
  notifications: DashboardNotificationItem[]
  markNotificationsPending: boolean
  onMarkAllRead: () => void
  onOpenNotification: (id: string) => void
  compact?: boolean
  rail?: boolean
}) {
  const tabs = useMemo(
    () =>
      [
        { id: 'signals' as const, label: COPY.notifications.tabSignals },
        { id: 'approvals' as const, label: COPY.notifications.tabApprovals },
        { id: 'other' as const, label: COPY.notifications.tabOther },
      ] as const,
    [],
  )

  const unreadByGroup = useMemo(() => {
    const counts: Record<NotificationInboxGroup, number> = {
      signals: 0,
      approvals: 0,
      other: 0,
    }
    for (const n of notifications) {
      if (!n.read) counts[n.group] += 1
    }
    return counts
  }, [notifications])

  const defaultTab = useMemo((): NotificationInboxGroup => {
    if (unreadByGroup.signals > 0) return 'signals'
    if (unreadByGroup.approvals > 0) return 'approvals'
    if (unreadByGroup.other > 0) return 'other'
    if (notifications.some((n) => n.group === 'signals')) return 'signals'
    if (notifications.some((n) => n.group === 'approvals')) return 'approvals'
    return 'other'
  }, [notifications, unreadByGroup])

  const [activeTab, setActiveTab] = useState<NotificationInboxGroup>(defaultTab)

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  const filtered = useMemo(
    () => notifications.filter((n) => n.group === activeTab),
    [activeTab, notifications],
  )

  const unreadLabel = COPY.notifications.unreadCount.replace(
    '{count}',
    String(unreadCount),
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <NotificationTrigger unreadCount={unreadCount} compact={compact} rail={rail} />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="z-[200] w-[min(100vw-1.5rem,26rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{COPY.notifications.title}</h3>
            {unreadCount > 0 ? (
              <p className="text-[11px] text-muted-foreground">{unreadLabel}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={unreadCount === 0 || markNotificationsPending}
            aria-label={COPY.notifications.markAllReadAria}
            title={COPY.notifications.markAllReadAria}
            onClick={onMarkAllRead}
          >
            <AppIcon icon={MailOpen} size={18} />
          </Button>
        </div>

        <div
          role="tablist"
          aria-label={COPY.notifications.title}
          className="flex gap-0.5 border-b px-2 py-2"
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id
            const count = unreadByGroup[tab.id]
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  selected
                    ? 'bg-muted/70 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                <span>{tab.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="max-h-[28rem] overflow-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {COPY.notifications.empty}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {COPY.notifications.emptyTab}
            </p>
          ) : (
            filtered.map((notification) => {
              const unread = !notification.read
              const chipLabel =
                notification.group === 'signals'
                  ? notification.typeLabel
                  : notification.category &&
                      notification.category.toLowerCase() !==
                        notification.typeLabel.toLowerCase()
                    ? notification.category
                    : notification.typeLabel
              const summary =
                notification.text &&
                notification.text.trim().toLowerCase() !==
                  notification.title.trim().toLowerCase()
                  ? notification.text
                  : null
              const sourceLabel = notification.sourceLabel?.trim() || null
              const sourceUrl = notification.sourceUrl?.trim() || null
              return (
                <div
                  key={notification.id}
                  className={cn(
                    'relative border-b last:border-b-0 transition-colors',
                    unread
                      ? 'bg-accent/25 hover:bg-accent/35'
                      : 'opacity-60 hover:opacity-80 hover:bg-muted/30',
                  )}
                >
                  <Link
                    href={notification.href}
                    onClick={() => onOpenNotification(notification.id)}
                    className="absolute inset-0 z-0"
                    aria-label={notification.title}
                  />
                  <div className="relative z-10 flex pointer-events-none items-start gap-2.5 px-3 py-2.5">
                    <NotificationLogo
                      logoUrl={notification.logoUrl}
                      companyName={notification.companyName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            typeChipClass(notification.typeKind),
                          )}
                        >
                          {chipLabel}
                        </span>
                        {unread ? (
                          <span
                            className="size-2 shrink-0 rounded-full bg-primary"
                            title={COPY.notifications.unreadBadgeAria}
                            aria-label={COPY.notifications.unreadBadgeAria}
                          />
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'mt-1 truncate text-sm leading-snug',
                          unread
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground',
                        )}
                      >
                        {notification.title}
                      </p>
                      {summary ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                          {summary}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                        <span>{notification.time}</span>
                        {sourceLabel && sourceUrl ? (
                          <>
                            <span aria-hidden>·</span>
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="pointer-events-auto inline-flex max-w-full items-center gap-1 truncate hover:text-foreground hover:underline"
                            >
                              <span className="truncate">{sourceLabel}</span>
                              <AppIcon
                                icon={ExternalLink}
                                size={12}
                                className="shrink-0"
                              />
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SidebarNotificationsSection({
  userId,
  systemRole,
  functionRole,
  initialNotifications = [],
  layout = 'footer',
}: {
  userId: string
  systemRole: SystemRole
  functionRole: FunctionRole
  initialNotifications?: DashboardNotificationItem[]
  layout?: 'footer' | 'inline' | 'rail'
}) {
  const hydrated = useHydrated()
  const [notifications, setNotifications] =
    useState<DashboardNotificationItem[]>(initialNotifications)
  const [markNotificationsPending, startMarkNotifications] = useTransition()

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  useEffect(() => {
    async function refreshInbox() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const next = await getInboxNotificationsForLayout(
          userId,
          systemRole,
          functionRole,
        )
        setNotifications(next)
      } catch {
        // offline / transient — keep current list
      }
    }

    const id = window.setInterval(refreshInbox, INBOX_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshInbox()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [userId, systemRole, functionRole])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  function markAllNotificationsRead() {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id)
    if (!ids.length) return
    startMarkNotifications(() => {
      void markAllNotificationReads(ids).then((res) => {
        if (res.success) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
      })
    })
  }

  function handleOpenNotification(id: string) {
    startMarkNotifications(() => {
      void markNotificationRead(id).then((res) => {
        if (res.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
          )
        }
      })
    })
  }

  const popoverProps = {
    unreadCount,
    notifications,
    markNotificationsPending,
    onMarkAllRead: markAllNotificationsRead,
    onOpenNotification: handleOpenNotification,
  }

  const isInline = layout === 'inline'
  const isRail = layout === 'rail'

  if (isInline || isRail) {
    return hydrated ? (
      <NotificationsPopover {...popoverProps} compact rail={isRail} />
    ) : (
      <NotificationTrigger unreadCount={unreadCount} compact rail={isRail} disabled />
    )
  }

  return (
    <>
      <div className="mb-1.5 w-full group-data-[collapsible=icon]:hidden">
        {hydrated ? (
          <NotificationsPopover {...popoverProps} />
        ) : (
          <NotificationTrigger unreadCount={unreadCount} disabled />
        )}
      </div>

      <div className="mb-1 hidden justify-center group-data-[collapsible=icon]:flex">
        {hydrated ? (
          <NotificationsPopover {...popoverProps} compact />
        ) : (
          <NotificationTrigger unreadCount={unreadCount} compact disabled />
        )}
      </div>
    </>
  )
}
