'use server'

/**
 * Share-/Portfolio-API (Barrel). Implementierung in sharing-*.ts.
 */
export type { CreateSharedPortfolioRecipient } from '@/lib/references/library/sharing-create'
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
