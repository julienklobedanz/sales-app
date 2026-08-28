import type { DealRow, DealWithReferences } from '@/app/(app)/deals/types'

export function dealWithReferencesToRow(deal: DealWithReferences): DealRow {
  const bestScores = deal.references
    .map((r) => r.similarity_score)
    .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s))
  const best_match_score = bestScores.length ? Math.max(...bestScores) : null

  return {
    id: deal.id,
    title: deal.title,
    company_id: deal.company_id,
    company_name: deal.company_name,
    company_logo_url: deal.company_logo_url ?? null,
    industry: deal.industry,
    volume: deal.volume,
    requirements_text: deal.requirements_text,
    incumbent_provider: deal.incumbent_provider,
    is_public: deal.is_public,
    account_manager_id: deal.account_manager_id,
    account_manager_name: deal.account_manager_name,
    account_manager_avatar_url: deal.account_manager_avatar_url ?? null,
    sales_manager_id: deal.sales_manager_id,
    sales_manager_name: deal.sales_manager_name,
    sales_manager_avatar_url: deal.sales_manager_avatar_url ?? null,
    status: deal.status,
    is_rfp_mode: deal.is_rfp_mode,
    tender_id: deal.tender_id,
    tender: deal.tender,
    expiry_date: deal.expiry_date,
    created_at: deal.created_at,
    updated_at: deal.updated_at,
    linked_refs: deal.references.map((r) => ({
      id: r.id,
      title: r.title,
      company_name: r.company_name,
      logo_url: r.logo_url ?? null,
    })),
    best_match_score,
  }
}
