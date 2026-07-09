import Link from 'next/link'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'

import type { DashboardQueueTone } from '@/lib/dashboard-home/dashboard-home-types'

export type QueueTone = DashboardQueueTone

const QUEUE_DOT_CLASS: Record<QueueTone, string> = {
  gap: 'bg-destructive',
  warn: 'bg-amber-500',
  intent: 'bg-primary',
  neutral: 'bg-muted-foreground',
  info: 'bg-blue-500',
}

export function DashboardSectionCard({
  title,
  count,
  description,
  hero = false,
  children,
}: {
  title: ReactNode
  count?: number
  description?: string
  hero?: boolean
  children: ReactNode
}) {
  return (
    <Card className={cn('border-border shadow-sm', hero && 'border-border/80 shadow-md')}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {count != null ? (
            <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums">
              {count}
            </Badge>
          ) : null}
        </CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function WorkQueueRow({
  tone,
  title,
  meta,
  ctaLabel,
  href,
}: {
  tone: QueueTone
  title: ReactNode
  meta?: string
  ctaLabel: string
  href: string
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className={cn('size-2 shrink-0 rounded-full', QUEUE_DOT_CLASS[tone])} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <span>{title}</span>
        {meta ? <span className="text-muted-foreground"> · {meta}</span> : null}
      </div>
      <Button asChild variant="outline" size="sm" className="h-7 shrink-0 text-xs">
        <Link href={href}>
          {ctaLabel} →
        </Link>
      </Button>
    </div>
  )
}

export function HonestEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
    </div>
  )
}

export function CoverageDonut({
  percent,
  label,
  sublabel,
}: {
  percent: number
  label: string
  sublabel: string
}) {
  const r = 46
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = c * (1 - clamped / 100)

  return (
    <svg width={118} height={118} viewBox="0 0 120 120" className="shrink-0" aria-hidden>
      <circle cx={60} cy={60} r={r} fill="none" className="stroke-muted" strokeWidth={14} />
      <circle
        cx={60}
        cy={60}
        r={r}
        fill="none"
        className="stroke-primary"
        strokeWidth={14}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text x={60} y={58} textAnchor="middle" className="fill-foreground text-[24px] font-bold">
        {label}
      </text>
      <text x={60} y={76} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {sublabel}
      </text>
    </svg>
  )
}

export function HorizontalBarList({
  items,
}: {
  items: Array<{ label: string; value: number; display?: string }>
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5 text-xs">
          <span className="w-40 shrink-0 truncate text-foreground">{item.label}</span>
          <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-md bg-muted">
            <span
              className="block h-full rounded-md bg-primary"
              style={{ width: `${Math.max(3, Math.round((item.value / max) * 100))}%` }}
            />
          </span>
          <span className="w-11 shrink-0 text-right tabular-nums text-muted-foreground">
            {item.display ?? String(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DashboardFooterStrip({
  label,
  items,
}: {
  label: string
  items: Array<{ text: string }>
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="text-[10.5px] font-medium uppercase tracking-wide">{label}</span>
      {items.map((item) => (
        <span key={item.text}>{item.text}</span>
      ))}
    </div>
  )
}

export function FunnelBarList({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const max = Math.max(...steps.map((s) => s.value), 1)
  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const width = Math.max(8, Math.round((step.value / max) * 100))
        return (
          <div key={step.label} className="flex items-center gap-2.5 text-xs">
            <span className="w-[150px] shrink-0 text-muted-foreground">{step.label}</span>
            <span className="h-[18px] min-w-0 flex-1 overflow-hidden rounded-md bg-muted">
              <span className="block h-full rounded-md bg-primary" style={{ width: `${width}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{step.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export function StatusTonePill({ tone }: { tone: 'ok' | 'warn' | 'gap' }) {
  const h = COPY.dashboard.home
  const label = tone === 'ok' ? h.statusCurrent : tone === 'warn' ? h.statusExpiring : h.statusStale
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px]',
        tone === 'ok' && 'border-primary/30 bg-primary/10 text-primary',
        tone === 'warn' && 'border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
        tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive'
      )}
    >
      {label}
    </Badge>
  )
}

export function WinRateCompareBars({
  withPercent,
  withoutPercent,
  withLabel,
  withoutLabel,
}: {
  withPercent: number
  withoutPercent: number
  withLabel: string
  withoutLabel: string
}) {
  return (
    <div className="space-y-2">
      {[
        { label: withLabel, value: withPercent },
        { label: withoutLabel, value: withoutPercent },
      ].map((row) => (
        <div key={row.label} className="flex items-center gap-2.5 text-sm">
          <span className="w-[104px] shrink-0 text-muted-foreground">{row.label}</span>
          <span className="h-4 min-w-0 flex-1 overflow-hidden rounded-md bg-muted">
            <span
              className={cn('block h-full rounded-md', row.label === withLabel ? 'bg-primary' : 'bg-muted-foreground/40')}
              style={{ width: `${Math.max(4, row.value)}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{row.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function SignalStatusPill({ tone }: { tone: 'ok' | 'warn' | 'gap' }) {
  const h = COPY.dashboard.home
  const label =
    tone === 'ok' ? h.signalPillChance : tone === 'warn' ? h.signalPillRisk : h.signalPillCritical
  return (
    <Badge
      variant="outline"
      className={cn(
        'min-w-[66px] justify-center text-[11px]',
        tone === 'ok' && 'border-primary/30 bg-primary/10 text-primary',
        tone === 'warn' && 'border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
        tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive'
      )}
    >
      {label}
    </Badge>
  )
}
