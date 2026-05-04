/**
 * Brandfetch liefert englische Branchenlabels (z. B. „lifestyle fashion & apparel“).
 * Wir mappen auf die deutschsprachigen Kategorien aus Referenz/Account-UI.
 */
const INDUSTRIES_MAP: { keywords: string[]; value: string }[] = [
  { keywords: ['finance', 'finanz', 'banking', 'insurance', 'versicherung'], value: 'Finanzdienstleistungen & Versicherung' },
  {
    keywords: [
      'retail',
      'handel',
      'ecommerce',
      'e-commerce',
      'consumer',
      'cpg',
      'packaged goods',
      'fashion',
      'apparel',
      'footwear',
      'clothing',
      'textile',
      'sportswear',
      'jewelry',
      'jewellery',
      'luxury goods',
      'luxury brand',
      'cosmetics',
      'beauty',
      'lifestyle',
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

export function mapBrandfetchIndustryToGermanCategory(name: string | null | undefined): string | null {
  if (!name?.trim()) return null
  const lower = name.toLowerCase()
  for (const { keywords, value } of INDUSTRIES_MAP) {
    if (keywords.some((k) => lower.includes(k))) return value
  }
  return INDUSTRY_DEFAULT
}
