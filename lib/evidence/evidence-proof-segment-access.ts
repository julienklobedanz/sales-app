import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'

/** Compliance/Unternehmensnachweis: AM, Sales Leader, Admin — nicht Sales Rep / Viewer. */
export function canViewComplianceEvidenceSegment(
  systemRole: SystemRole,
  functionRole: FunctionRole
): boolean {
  if (systemRole === 'viewer') return false
  if (functionRole === 'sales_rep') return false
  return true
}
