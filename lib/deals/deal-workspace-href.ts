import {
  DEAL_WORKSPACE_DEFAULT_AREA,
  isDealWorkspaceArea,
  type DealWorkspaceArea,
} from '@/lib/deals/deal-workspace-areas'
import { ROUTES } from '@/lib/routes'

export function dealWorkspaceHref(dealId: string): string {
  return `/dashboard/deals/${dealId}/ausschreibung`
}

export function dealWorkspaceAreaHref(
  dealId: string,
  area: DealWorkspaceArea,
): string {
  return `${dealWorkspaceHref(dealId)}/${area}`
}

/** Landepunkt nach Promote — Inhalt wechselt unter dem Nutzer den Ort. */
export function dealWorkspaceLandingHref(dealId: string): string {
  return dealWorkspaceAreaHref(dealId, DEAL_WORKSPACE_DEFAULT_AREA)
}

export const DEAL_RFP_HASH_IDS = [
  'urteil',
  'stammdaten',
  'lose',
  'eligCard',
  'risks',
  'drafts',
  'dokumente',
  'ausschreibung',
  'notice-hero',
] as const

type DealRfpHashId = (typeof DEAL_RFP_HASH_IDS)[number]

export type DealHashSurface = 'deal-page' | 'workspace'

export type DealWorkspaceAccess =
  | { kind: 'not-found' }
  | { kind: 'redirect-deal'; href: string }
  | { kind: 'ok' }

const DEAL_RFP_HASH_TO_AREA: Record<DealRfpHashId, DealWorkspaceArea | null> = {
  urteil: null,
  stammdaten: 'stammdaten',
  lose: 'lose',
  eligCard: 'eignung',
  risks: 'risiken',
  drafts: 'entwuerfe',
  dokumente: 'dokumente',
  ausschreibung: DEAL_WORKSPACE_DEFAULT_AREA,
  'notice-hero': 'steckbrief',
}

export function resolveDealWorkspaceAccess(deal: {
  id: string
  is_rfp_mode: boolean
} | null): DealWorkspaceAccess {
  if (!deal) return { kind: 'not-found' }
  if (!deal.is_rfp_mode) {
    return { kind: 'redirect-deal', href: ROUTES.deals.detail(deal.id) }
  }
  return { kind: 'ok' }
}

function normalizeHashId(hash: string): string {
  return hash.replace(/^#/, '').trim()
}

function isDealRfpHashId(id: string): id is DealRfpHashId {
  return (DEAL_RFP_HASH_IDS as readonly string[]).includes(id)
}

export function parseDealWorkspaceAreaFromPathname(
  pathname: string,
): DealWorkspaceArea | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'dashboard' || parts[1] !== 'deals' || parts[3] !== 'ausschreibung') {
    return null
  }
  const slug = parts[4]
  return slug && isDealWorkspaceArea(slug) ? slug : null
}

/**
 * Alte Anker dürfen nicht ins Leere (Lehre S4).
 * Ohne RFP-Modus kein Sprung in den Arbeitsbereich — sonst Redirect-Schleife.
 */
export function resolveDealRfpHash(args: {
  hash: string
  isRfpDeal: boolean
  current: DealHashSurface
  currentArea?: DealWorkspaceArea | null
  dealId: string
}): { href: string } | null {
  const id = normalizeHashId(args.hash)
  if (!id || !isDealRfpHashId(id)) return null
  if (!args.isRfpDeal) return null

  const targetArea = DEAL_RFP_HASH_TO_AREA[id]
  if (targetArea == null) {
    if (args.current === 'deal-page') return null
    return { href: `${ROUTES.deals.detail(args.dealId)}#urteil` }
  }

  if (args.current === 'workspace' && args.currentArea === targetArea) return null
  return { href: dealWorkspaceAreaHref(args.dealId, targetArea) }
}
