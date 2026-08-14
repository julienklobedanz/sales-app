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

/** Text-only status color (metrics, scores). */
export const statusToneText = {
  success: 'text-status-success-foreground',
  warning: 'text-status-warning-foreground',
  danger: 'text-status-danger-foreground',
  info: 'text-status-info-foreground',
  muted: 'text-muted-foreground',
} as const

/** Solid fill for compact recommendation chips. */
export const statusToneFill = {
  success: 'bg-status-success text-white',
  warning: 'bg-status-warning text-white',
  danger: 'bg-status-danger text-white',
  info: 'bg-status-info text-white',
  muted: 'bg-muted-foreground/80 text-white',
} as const

export type StatusTone = keyof typeof statusTone
