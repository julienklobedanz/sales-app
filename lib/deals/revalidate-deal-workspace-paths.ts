import { revalidatePath } from 'next/cache'

import {
  DEAL_WORKSPACE_AREA_IDS,
  type DealWorkspaceArea,
} from '@/lib/deals/deal-workspace-areas'
import {
  dealWorkspaceAreaHref,
  dealWorkspaceHref,
} from '@/lib/deals/deal-workspace-href'
import { ROUTES } from '@/lib/routes'

/**
 * Deal-Seite plus Workspace-Root und Bereichs-Unterroute(n).
 * Ohne `area`: alle sieben Flächen (Analyse, Promote).
 */
export function revalidateDealWorkspacePaths(
  dealId: string,
  area?: DealWorkspaceArea | readonly DealWorkspaceArea[],
) {
  revalidatePath(ROUTES.deals.detail(dealId), 'page')
  revalidatePath(dealWorkspaceHref(dealId), 'page')
  const areas: readonly DealWorkspaceArea[] =
    area == null ? DEAL_WORKSPACE_AREA_IDS : typeof area === 'string' ? [area] : area
  for (const next of areas) {
    revalidatePath(dealWorkspaceAreaHref(dealId, next), 'page')
  }
}
