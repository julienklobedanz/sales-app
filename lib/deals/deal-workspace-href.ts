import { ROUTES } from '@/lib/routes'

/** S6.1: eine Unterroute. S6.2 bindet denselben Helfer auf `/dokumente`. */
export function dealWorkspaceHref(dealId: string): string {
  return `/dashboard/deals/${dealId}/ausschreibung`
}

/** Landepunkt nach Promote — Inhalt wechselt unter dem Nutzer den Ort. */
export function dealWorkspaceLandingHref(dealId: string): string {
  return dealWorkspaceHref(dealId)
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

export type DealRfpHashId = (typeof DEAL_RFP_HASH_IDS)[number]

export type DealHashSurface = 'deal-page' | 'workspace'

export type DealWorkspaceAccess =
  | { kind: 'not-found' }
  | { kind: 'redirect-deal'; href: string }
  | { kind: 'ok' }

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

export function isDealRfpHashId(id: string): id is DealRfpHashId {
  return (DEAL_RFP_HASH_IDS as readonly string[]).includes(id)
}

function hashTargetSurface(id: DealRfpHashId): DealHashSurface {
  return id === 'urteil' ? 'deal-page' : 'workspace'
}

/**
 * Alte Anker dürfen nicht ins Leere (Lehre S4).
 * Ohne RFP-Modus kein Sprung in den Arbeitsbereich — sonst Redirect-Schleife.
 */
export function resolveDealRfpHash(args: {
  hash: string
  isRfpDeal: boolean
  current: DealHashSurface
  dealId: string
}): { href: string } | null {
  const id = normalizeHashId(args.hash)
  if (!id || !isDealRfpHashId(id)) return null
  if (!args.isRfpDeal) return null

  const target = hashTargetSurface(id)
  if (target === args.current) return null

  if (target === 'deal-page') {
    return { href: `${ROUTES.deals.detail(args.dealId)}#urteil` }
  }

  const workspace = dealWorkspaceHref(args.dealId)
  if (id === 'ausschreibung') return { href: workspace }
  return { href: `${workspace}#${id}` }
}
