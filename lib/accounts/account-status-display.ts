import type { AccountStatusValue } from './account-status'
import { statusTone } from '@/lib/ui/status-tone'

export type AccountStatusDisplay = {
  label: string
  className: string
}

const DISPLAY: Record<AccountStatusValue, AccountStatusDisplay> = {
  target: {
    label: 'Target',
    className: statusTone.info,
  },
  active_customer: {
    label: 'Aktiver Kunde',
    className: statusTone.success,
  },
  former_customer: {
    label: 'Ehemaliger Kunde',
    className: statusTone.neutral,
  },
  at_risk: {
    label: 'At Risk',
    className: statusTone.warning,
  },
}

export function accountStatusDisplay(
  status: AccountStatusValue | null | undefined,
): AccountStatusDisplay | null {
  if (!status) return null
  return DISPLAY[status] ?? null
}
