import Link from 'next/link'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { dashboardFirstName } from '@/lib/dashboard-home/dashboard-home-pure'
import { AppIcon, type AppIconProps } from '@/lib/icons'
import type { FunctionRole } from '@/lib/roles/capabilities'
import { cn } from '@/lib/utils'

type RoleDashboardShellProps = {
  greetingName: string | null
  functionRole: FunctionRole
  subtitle: string
  ctaLabel: string
  ctaHref: string
  ctaIcon?: AppIconProps['icon']
  thin?: boolean
  thinBannerText?: string
  children: ReactNode
  footer?: ReactNode
}

function roleBadgeLabel(role: FunctionRole): string {
  return COPY.roleDimensions.functionRoles[role] ?? role
}

export function RoleDashboardShell({
  greetingName,
  functionRole,
  subtitle,
  ctaLabel,
  ctaHref,
  ctaIcon,
  thin = false,
  thinBannerText,
  children,
  footer,
}: RoleDashboardShellProps) {
  const firstName =
    dashboardFirstName(greetingName) || COPY.dashboard.home.shellGreetingFallback

  return (
    <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-8')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            {COPY.dashboard.home.shellGreeting} {firstName}
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">
              {roleBadgeLabel(functionRole)}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link href={ctaHref}>
            {ctaIcon ? <AppIcon icon={ctaIcon} size={16} /> : null}
            {ctaLabel}
          </Link>
        </Button>
      </div>

      {thin && thinBannerText ? (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {thinBannerText}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">{children}</div>

      {footer}
    </div>
  )
}
