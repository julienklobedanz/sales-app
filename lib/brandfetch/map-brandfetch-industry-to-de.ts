import { isIndustryId, resolveIndustryId } from '@/lib/constants/industries'

/**
 * Brandfetch liefert englische Branchenlabels (z. B. „lifestyle fashion & apparel“).
 * Wir mappen auf kanonische Master-IDs (`fin`, `tech`, …).
 *
 * Hinweis: Die API liefert oft mehrere `company.industries[]` – alle Namen zusammenführen,
 * sonst kann ein generischer erster Eintrag das Mapping verfälschen.
 */
const INDUSTRIES_MAP: { id: string; keywords: string[] }[] = [
  {
    id: 'fin',
    keywords: ['finance', 'finanz', 'banking', 'insurance', 'versicherung', 'fintech', 'asset management'],
  },
  {
    id: 'ret',
    keywords: [
      'retail',
      'retailer',
      'specialty retail',
      'department store',
      'handel',
      'ecommerce',
      'e-commerce',
      'consumer',
      'consumer discretionary',
      'consumer staples',
      'cpg',
      'packaged goods',
      'fashion',
      'apparel',
      'footwear',
      'clothing',
      'textile',
      'textiles',
      'sportswear',
      'jewelry',
      'jewellery',
      'luxury goods',
      'luxury brand',
      'luxury',
      'designer',
      'boutique',
      'garment',
      'leather goods',
      'leather',
      'accessories',
      'watches',
      'cosmetics',
      'beauty',
      'food',
      'dairy',
      'beverage',
      'beverages',
      'grocery',
      'supermarket',
      'agriculture',
      'fmcg',
      'lifestyle',
      'wearing apparel',
      'personal luxury',
    ],
  },
  {
    id: 'man',
    keywords: [
      'manufacturing',
      'industrie',
      'production',
      'automotive',
      'engineering',
      'metals',
      'metal',
      'metallurgy',
      'smelting',
      'industrial',
      'machinery',
      'aerospace',
      'defense manufacturing',
    ],
  },
  {
    id: 'tech',
    keywords: [
      'software',
      'saas',
      'internet',
      'computer',
      'telecom',
      'technology',
      'tech',
      'it ',
      'cloud',
      'cyber',
      'information technology',
      'semiconductor',
      'hardware',
      'data center',
    ],
  },
  {
    id: 'media',
    keywords: [
      'media',
      'entertainment',
      'marketing',
      'advertising',
      'broadcast',
      'publishing',
      'gaming',
      'streaming',
      'content creation',
      'digital media',
    ],
  },
  {
    id: 'energy',
    keywords: ['energy', 'utilities', 'oil', 'gas', 'power', 'renewable', 'mining', 'resources', 'utility'],
  },
  {
    id: 'health',
    keywords: [
      'health',
      'gesundheit',
      'medical',
      'pharma',
      'life science',
      'life sciences',
      'biotech',
      'chemical',
      'hospital',
      'healthcare',
    ],
  },
  {
    id: 'pub',
    keywords: [
      'government',
      'public sector',
      'öffentlich',
      'defence',
      'defense',
      'administration',
      'education',
      'municipal',
      'behörde',
      'public administration',
    ],
  },
  {
    id: 'log',
    keywords: [
      'logistics',
      'logistik',
      'transport',
      'shipping',
      'aviation',
      'airline',
      'freight',
      'travel',
      'hospitality',
      'tourism',
      'supply chain',
      'warehouse',
    ],
  },
  {
    id: 'cons',
    keywords: [
      'professional services',
      'consulting',
      'advisory',
      'audit',
      'legal services',
      'management consulting',
      'business services',
    ],
  },
  {
    id: 'prop',
    keywords: [
      'real estate',
      'construction',
      'immobilien',
      'bau',
      'property',
      'building',
      'architecture',
      'civil engineering',
    ],
  },
]

const INDUSTRY_DEFAULT_ID = 'other'

/** Alle Brandfetch-Industry-Namen zu einem String (für Keyword-Matching). */
export function joinBrandfetchIndustryNames(
  industries: { name?: string | null }[] | null | undefined
): string | null {
  if (!industries?.length) return null
  const parts = industries
    .map((i) => String(i?.name ?? '').trim())
    .filter(Boolean)
  if (!parts.length) return null
  return parts.join(' | ')
}

export function mapBrandfetchIndustryToGermanCategory(name: string | null | undefined): string | null {
  const id = mapBrandfetchIndustryToMasterId(name)
  return id
}

function mapBrandfetchIndustryToMasterId(name: string | null | undefined): string | null {
  if (!name?.trim()) return null

  const fromKnown = resolveIndustryId(name)
  if (fromKnown) return fromKnown

  const lower = name.toLowerCase()
  for (const { keywords, id } of INDUSTRIES_MAP) {
    if (keywords.some((k) => lower.includes(k))) return id
  }

  return INDUSTRY_DEFAULT_ID
}

/** Direkt aus Brandfetch `company.industries` mappen (mehrere Einträge berücksichtigen). */
export function mapBrandfetchIndustriesArrayToGermanCategory(
  industries: { name?: string | null }[] | null | undefined
): string | null {
  const raw = joinBrandfetchIndustryNames(industries)
  if (!raw) return null
  return mapBrandfetchIndustryToMasterId(raw)
}

/** Expliziter Export für neue Call-Sites. */
export function mapBrandfetchIndustriesArrayToMasterId(
  industries: { name?: string | null }[] | null | undefined
): string | null {
  return mapBrandfetchIndustriesArrayToGermanCategory(industries)
}

export function isMasterIndustryId(value: string | null | undefined): boolean {
  return isIndustryId(value)
}
