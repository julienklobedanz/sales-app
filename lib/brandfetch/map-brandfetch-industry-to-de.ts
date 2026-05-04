/**
 * Brandfetch liefert englische Branchenlabels (z. B. „lifestyle fashion & apparel“).
 * Wir mappen auf die deutschsprachigen Kategorien aus Referenz/Account-UI.
 *
 * Hinweis: Die API liefert oft mehrere `company.industries[]` – alle Namen zusammenführen,
 * sonst kann ein generischer erster Eintrag das Mapping zu „Sonstige“ erzwingen.
 */
const INDUSTRIES_MAP: { keywords: string[]; value: string }[] = [
  { keywords: ['finance', 'finanz', 'banking', 'insurance', 'versicherung'], value: 'Finanzdienstleistungen & Versicherung' },
  {
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
      'lifestyle',
      'wearing apparel',
      'personal luxury',
    ],
    value: 'Handel & Konsumgüter',
  },
  { keywords: ['manufacturing', 'industrie', 'production', 'automotive', 'engineering'], value: 'Industrie & Automotive' },
  { keywords: ['software', 'it ', 'technology', 'tech', 'internet', 'computer', 'media', 'telecom', 'tmt'], value: 'Technologie, Medien & Telekommunikation' },
  { keywords: ['energy', 'utilities', 'resources', 'oil', 'gas', 'mining'], value: 'Energie, Rohstoffe & Versorgung' },
  { keywords: ['health', 'gesundheit', 'medical', 'pharma', 'life sciences'], value: 'Gesundheitswesen & Life Sciences' },
  { keywords: ['government', 'public', 'öffentlich', 'defence', 'administration', 'education'], value: 'Öffentlicher Sektor & Bildung' },
  { keywords: ['professional services', 'consulting', 'logistics'], value: 'Beratung & Logistik' },
  { keywords: ['travel', 'transport', 'hospitality', 'tourism'], value: 'Reise, Transport & Gastgewerbe' },
]

const INDUSTRY_DEFAULT = 'Sonstige'

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
  if (!name?.trim()) return null
  const lower = name.toLowerCase()
  for (const { keywords, value } of INDUSTRIES_MAP) {
    if (keywords.some((k) => lower.includes(k))) return value
  }
  return INDUSTRY_DEFAULT
}

/** Direkt aus Brandfetch `company.industries` mappen (mehrere Einträge berücksichtigen). */
export function mapBrandfetchIndustriesArrayToGermanCategory(
  industries: { name?: string | null }[] | null | undefined
): string | null {
  const raw = joinBrandfetchIndustryNames(industries)
  if (!raw) return null
  return mapBrandfetchIndustryToGermanCategory(raw)
}
