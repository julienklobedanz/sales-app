import { RPC_SALES_VISIBLE_REFERENCE_STATUSES } from '@/lib/roles/reference-visibility-scope'

/** Spiegelt die Sales-RLS-Einschränkung für Service-Role-Ladevorgänge (kein Draft/NDA/Confidential). */
export function applySalesVisibleReferenceFilters<
  Q extends {
    in: (column: string, values: readonly string[]) => Q
    eq: (column: string, value: boolean) => Q
  },
>(query: Q): Q {
  return query
    .in('status', [...RPC_SALES_VISIBLE_REFERENCE_STATUSES])
    .eq('is_nda_deal', false)
    .eq('approval_scope_confidential_sales', false)
}

/** Deals für Account-Gedächtnis: nur Org + Company, nie account_manager_id. */
export function accountProofMemoryDealFilter<Q extends { eq: (column: string, value: string) => Q }>(
  query: Q,
  organizationId: string,
  companyId: string
): Q {
  return query.eq('organization_id', organizationId).eq('company_id', companyId)
}
