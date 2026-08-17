import { revalidatePath } from 'next/cache'

import { dealWorkspaceHref } from '@/lib/deals/deal-workspace-href'
import { ROUTES } from '@/lib/routes'

/**
 * S6.1: Deal-Seite und die eine Unterroute. S6.2 spaltet nach Bereich.
 * Ohne die Unterroute wäre der 1:1-Umzug schlechter als heute (Lehre S2).
 */
export function revalidateDealWorkspacePaths(dealId: string) {
  revalidatePath(ROUTES.deals.detail(dealId), 'page')
  revalidatePath(dealWorkspaceHref(dealId), 'page')
}
