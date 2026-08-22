import { resolveIndustryId } from '@/lib/constants/industries'
import type { AccountsNdaFilter } from '@/lib/accounts/account-collection-columns'
import type { CompanyCard, ReferencesFilter } from './accounts-grid-types'

export function filterAccountCollectionRows(
  companies: CompanyCard[],
  opts: {
    search: string
    ndaFilter: AccountsNdaFilter
    industryFilter: string
    locationFilter: string
    referencesFilter: ReferencesFilter
  },
): CompanyCard[] {
  const q = opts.search.trim().toLowerCase()
  return companies.filter((company) => {
    if (q && !company.name.toLowerCase().includes(q)) return false
    if (opts.ndaFilter !== 'all' && (company.nda_status ?? 'none') !== opts.ndaFilter) {
      return false
    }
    if (
      opts.industryFilter !== 'all' &&
      resolveIndustryId(company.industry) !== opts.industryFilter
    ) {
      return false
    }
    if (opts.locationFilter !== 'all' && (company.headquarters ?? '') !== opts.locationFilter) {
      return false
    }
    const refs = company.reference_count ?? 0
    if (opts.referencesFilter === 'with' && refs === 0) return false
    if (opts.referencesFilter === 'without' && refs > 0) return false
    return true
  })
}
