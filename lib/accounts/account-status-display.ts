import type { CompanyAccountStatusValue } from './company-account-status'

export type AccountStatusDisplay = {
  label: string
  className: string
}

const DISPLAY: Record<CompanyAccountStatusValue, AccountStatusDisplay> = {
  target: {
    label: 'Target',
    className:
      'border-sky-200/80 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100',
  },
  active_customer: {
    label: 'Aktiver Kunde',
    className:
      'border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100',
  },
  former_customer: {
    label: 'Ehemaliger Kunde',
    className:
      'border-border/80 bg-muted/50 text-muted-foreground dark:border-border dark:bg-muted/30',
  },
  at_risk: {
    label: 'At Risk',
    className:
      'border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100',
  },
}

export function accountStatusDisplay(
  status: CompanyAccountStatusValue | null | undefined
): AccountStatusDisplay | null {
  if (!status) return null
  return DISPLAY[status] ?? null
}
