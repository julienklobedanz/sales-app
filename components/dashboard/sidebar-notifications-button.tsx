'use client'

import Link from 'next/link'
import { forwardRef, useEffect, useMemo, useState, useTransition } from 'react'
import { Bell, MailOpen } from '@hugeicons/core-free-icons'

import {
  getInboxNotificationsForLayout,
  markAllNotificationReads,
  markNotificationRead,
  type DashboardNotificationItem,
} from '@/app/dashboard/actions'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useHydrated } from '@/hooks/use-hydrated'
import { type AppRole } from '@/hooks/useRole'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'

const INBOX_POLL_MS = 120_000

const triggerClassName =
  'relative flex items-center justify-center rounded-xl border border-border/50 bg-muted/20 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const NotificationTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    unreadCount: number
    compact?: boolean
    rail?: boolean
  }
>(function NotificationTrigger({ unreadCount, compact = false, rail = false, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        rail ? 'cognism-sidebar-icon-btn' : triggerClassName,
        compact && !rail && 'size-9 shrink-0 rounded-lg border-border/40 bg-muted/45 shadow-none hover:bg-muted/75',
        !compact && !rail && 'h-9 w-full',
        className
      )}
      aria-label="Benachrichtigungen"
      {...props}
    >
      <AppIcon icon={Bell} size={16} />
      {unreadCount > 0 ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-destructive font-bold text-white',
            compact ? 'h-3.5 min-w-3.5 px-0.5 text-[9px]' : 'h-4 min-w-4 px-1 text-[10px]'
          )}
        >
          {compact && unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  )
})

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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <NotificationTrigger unreadCount={unreadCount} compact={compact} rail={rail} />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="z-[200] w-96 p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{COPY.notifications.title}</h3>
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
        <div className="max-h-[28rem] overflow-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Benachrichtigungen.
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-2 border-b px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={notification.href}
                    onClick={() => onOpenNotification(notification.id)}
                    className={cn(
                      'inline-block max-w-full truncate rounded-sm text-sm font-medium text-foreground underline-offset-2 transition-colors',
                      'hover:text-primary hover:underline',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  >
                    {notification.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{notification.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{notification.time}</p>
                </div>
                {!notification.read ? (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-sidebar-primary"
                    title={COPY.notifications.unreadBadgeAria}
                    aria-label={COPY.notifications.unreadBadgeAria}
                  />
                ) : null}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SidebarNotificationsSection({
  userId,
  userRole,
  initialNotifications = [],
  layout = 'footer',
}: {
  userId: string
  userRole: AppRole
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
        const next = await getInboxNotificationsForLayout(userId, userRole)
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
  }, [userId, userRole])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
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
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
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
