import type { SupabaseClient } from '@supabase/supabase-js'
import { loadAccountManagerDashboardData } from '@/lib/dashboard-home/dashboard-home-account-manager'
import { loadSalesRepDashboardData } from '@/lib/dashboard-home/dashboard-home-sales-rep'
import type { GeneralistDashboardModel } from '@/lib/dashboard-home/dashboard-home-types'

export async function loadGeneralistDashboardData(
  supabase: SupabaseClient,
  userId: string,
  fullName: string | null,
  orgId: string | undefined,
): Promise<GeneralistDashboardModel> {
  const salesSlice = await loadSalesRepDashboardData(supabase, userId, fullName, orgId)
  const amSlice = await loadAccountManagerDashboardData(supabase, userId, fullName, orgId)

  return {
    leadQuestion: 'Was ist heute wichtig in deinem Workspace?',
    activeDeals: salesSlice.activeDeals,
    pendingApprovalsCount: amSlice.pendingApprovalsCount,
    pendingApprovalsPreview: amSlice.pendingApprovals.slice(0, 5).map((p) => ({
      approvalId: p.approvalId,
      referenceId: p.referenceId,
      title: p.title,
      companyName: p.companyName,
    })),
    usageTotals: amSlice.usageTotals,
    recentShares: salesSlice.recentShares,
  }
}
