export type StakeholderRole =
  | 'economic_buyer'
  | 'champion'
  | 'blocker'
  | 'technical_buyer'
  | 'user_buyer'
  | 'unknown'

const STAKEHOLDER_ROLES: StakeholderRole[] = [
  'economic_buyer',
  'champion',
  'blocker',
  'technical_buyer',
  'user_buyer',
  'unknown',
]

export function parseStakeholderRole(value: unknown): StakeholderRole {
  if (typeof value === 'string' && STAKEHOLDER_ROLES.includes(value as StakeholderRole)) {
    return value as StakeholderRole
  }
  return 'unknown'
}
