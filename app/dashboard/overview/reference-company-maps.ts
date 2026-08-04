type CompanyLike = {
  id: string
  logo_url?: string | null
  industry?: string | null
}

type ReferenceLike = {
  company_id: string | null
  company_logo_url?: string | null
  industry?: string | null
}

export function buildCompanyLogoById(
  companies: CompanyLike[],
  references: ReferenceLike[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const company of companies) {
    const url = String(company.logo_url ?? '').trim()
    if (url) map.set(company.id, url)
  }
  for (const ref of references) {
    if (!ref.company_id) continue
    const url = String(ref.company_logo_url ?? '').trim()
    if (url && !map.has(ref.company_id)) map.set(ref.company_id, url)
  }
  return map
}

export function buildCompanyIndustryById(companies: CompanyLike[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const company of companies) {
    const industry = String(company.industry ?? '').trim()
    if (industry) map.set(company.id, industry)
  }
  return map
}

export function buildCompanyIdsNeedingBrandfetch(
  references: ReferenceLike[],
  companies: CompanyLike[],
  companyIndustryById: Map<string, string>
): string[] {
  const ids = new Set<string>()
  for (const ref of references) {
    if (!ref.company_id) continue
    const hasLogo =
      Boolean(String(ref.company_logo_url ?? '').trim()) ||
      Boolean(String(companies.find((c) => c.id === ref.company_id)?.logo_url ?? '').trim())
    const hasIndustry =
      Boolean(String(ref.industry ?? '').trim()) || companyIndustryById.has(ref.company_id)
    if (!hasLogo || !hasIndustry) ids.add(ref.company_id)
  }
  return [...ids]
}
