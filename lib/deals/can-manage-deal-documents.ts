import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'

export type DealDocumentAccessDeal = {
  sales_manager_id: string | null
  account_manager_id: string | null
}

/** Spiegelt Tabellen-RLS: Org-Manager oder zugewiesener Sales-/Account-Manager des Deals. */
export function canManageDealDocuments(
  deal: DealDocumentAccessDeal,
  userId: string,
  systemRole: SystemRole,
  functionRole: FunctionRole,
): boolean {
  if (profileCanManageOrgData(systemRole, functionRole)) return true
  if (deal.sales_manager_id === userId) return true
  if (deal.account_manager_id === userId) return true
  return false
}

/** Org-Manager oder SM/AM eines Loses dieser Ausschreibung. */
export function canManageTenderDocuments(
  lots: DealDocumentAccessDeal[],
  userId: string,
  systemRole: SystemRole,
  functionRole: FunctionRole,
): boolean {
  if (profileCanManageOrgData(systemRole, functionRole)) return true
  return lots.some((lot) => canManageDealDocuments(lot, userId, systemRole, functionRole))
}
