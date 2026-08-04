import { formatIndustryDisplay } from '@/lib/constants/industries'
import type { DealWithReferences } from '@/app/dashboard/deals/types'

/** Kontextzeilen für KI-Entwurf (Epic 5 / KAN-128). */
export function buildDealContextForKiEntwurf(deal: DealWithReferences): string {
  const parts = [
    deal.title ? `Deal: ${deal.title}` : null,
    deal.company_name ? `Account: ${deal.company_name}` : null,
    deal.industry ? `Branche: ${formatIndustryDisplay(deal.industry)}` : null,
    deal.volume ? `Volumen: ${deal.volume}` : null,
    deal.requirements_text?.trim()
      ? `Anforderungen:\n${deal.requirements_text.trim()}`
      : null,
  ].filter(Boolean)
  return parts.join('\n\n')
}
