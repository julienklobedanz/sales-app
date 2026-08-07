import type { StakeholderRole } from './actions'

export const ACCOUNT_DETAIL_TAB_TRIGGER_CLASS =
  'h-auto min-w-0 flex-1 justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-slate-500 shadow-none transition-all after:hidden hover:bg-slate-50 hover:text-slate-800 data-[state=active]:border-transparent data-[state=active]:bg-slate-100 data-[state=active]:font-medium data-[state=active]:text-slate-900 data-[state=active]:shadow-none dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900'

export type AccountDetailTab =
  | 'mission_control'
  | 'buying_center'
  | 'pipeline'
  | 'proof_points'

export function parseAccountDetailTab(value: string | null): AccountDetailTab {
  if (
    value === 'mission_control' ||
    value === 'buying_center' ||
    value === 'pipeline' ||
    value === 'proof_points'
  ) {
    return value
  }
  return 'mission_control'
}

export const STAKEHOLDER_ROLE_BADGES: Record<
  StakeholderRole,
  { label: string; className: string }
> = {
  economic_buyer: {
    label: 'Wirtschaftlicher Entscheider',
    className: 'bg-muted text-foreground border-border',
  },
  champion: {
    label: 'Executive Sponsor',
    className: 'bg-muted text-foreground border-border',
  },
  blocker: { label: 'Blocker', className: 'bg-muted text-foreground border-border' },
  technical_buyer: {
    label: 'Technischer Entscheider',
    className: 'bg-muted text-foreground border-border',
  },
  user_buyer: {
    label: 'Fachlicher Entscheider',
    className: 'bg-muted text-foreground border-border',
  },
  unknown: { label: 'Unbekannt', className: 'bg-muted text-foreground border-border' },
}

export function referenceStatusLabel(s: string) {
  if (s === 'approved') return 'Freigegeben'
  if (s === 'internal_only') return 'Intern'
  if (s === 'draft') return 'Entwurf'
  if (s === 'anonymized') return 'Anonymisiert'
  return s
}
