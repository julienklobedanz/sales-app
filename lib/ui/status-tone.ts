/**
 * Semantic status tones for badges (accounts, deals, approvals).
 * Colors come from CSS variables in `app/globals.css` (`--status-*`).
 */
export const statusTone = {
  success:
    'border-status-success-border bg-status-success-muted text-status-success-foreground',
  warning:
    'border-status-warning-border bg-status-warning-muted text-status-warning-foreground',
  danger:
    'border-status-danger-border bg-status-danger-muted text-status-danger-foreground',
  info: 'border-status-info-border bg-status-info-muted text-status-info-foreground',
  neutral:
    'border-border/80 bg-muted/50 text-muted-foreground dark:border-border dark:bg-muted/30',
} as const

export type StatusTone = keyof typeof statusTone
