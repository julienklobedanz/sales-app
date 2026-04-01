import { Badge } from '@/components/ui/badge'
import type { StakeholderRole } from './actions'
import { STAKEHOLDER_ROLE_BADGES } from './company-detail-constants'

export function StakeholderRoleBadge({ role }: { role: StakeholderRole }) {
  const cfg = STAKEHOLDER_ROLE_BADGES[role] ?? STAKEHOLDER_ROLE_BADGES.unknown
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}
