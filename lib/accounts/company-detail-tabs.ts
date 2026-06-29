export type CompanyDetailTab = 'overview' | 'deals' | 'references'

const LEGACY_TAB_MAP: Record<string, CompanyDetailTab> = {
  overview: 'overview',
  mission_control: 'overview',
  buying_center: 'overview',
  deals: 'deals',
  pipeline: 'deals',
  references: 'references',
  proof_points: 'references',
}

/** Liest `?tab=` und mappt Legacy-Werte auf die drei Proof-Linse-Tabs. */
export function normalizeCompanyDetailTab(param: string | null | undefined): CompanyDetailTab {
  if (!param) return 'overview'
  return LEGACY_TAB_MAP[param] ?? 'overview'
}

export function isCompanyDetailTab(value: string): value is CompanyDetailTab {
  return value === 'overview' || value === 'deals' || value === 'references'
}
