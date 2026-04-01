import type { StakeholderRole } from './actions'

export const STAKEHOLDER_ROLE_BADGES: Record<
  StakeholderRole,
  { label: string; className: string }
> = {
  economic_buyer: {
    label: 'Wirtschaftlicher Entscheider',
    className: 'bg-muted text-foreground border-border',
  },
  champion: { label: 'Champion', className: 'bg-muted text-foreground border-border' },
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
