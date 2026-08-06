/**
 * Share-/Portfolio-API (Barrel). Implementierung in sharing-*.ts.
 *
 * Kein `'use server'` hier: Turbopack erlaubt in Server-Action-Dateien keine
 * Re-Exports/`export type` — nur async Function-Exports.
 */
export type { CreateSharedPortfolioRecipient } from '@/lib/references/library/sharing-helpers'
export {
  createSharedPortfolioImpl,
  getPortfolioManageAndPreviewUrlsForApprovalEmail,
} from '@/lib/references/library/sharing-create'
export {
  getExistingShareForReferenceImpl,
  resetSharedPortfolioManageTokenImpl,
  updateShareLinkSecurityByReferenceImpl,
} from '@/lib/references/library/sharing-manage'
export {
  getPortfolioViewSessionsForReferenceImpl,
  getReferencesByIdsImpl,
} from '@/lib/references/library/sharing-queries'
