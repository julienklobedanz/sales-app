import { formatIndustryDisplay, resolveIndustryId } from '@/lib/constants/industries'
import {
  accountStatusSortRank,
  nextUrgencySortKey,
} from '@/lib/accounts/account-status-sort'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import { formatEmployeeCountDeDisplay } from '@/lib/format'
import type {
  CompanyCard,
  EmployeeBand,
  ReferencesFilter,
  SortMode,
} from './accounts-grid-types'

export function employeeLabel(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `${formatEmployeeCountDeDisplay(value)} Mitarbeiter`
}

export function filtersAreActive(
  filterIndustry: string,
  filterEmployeeBand: EmployeeBand,
  filterReferences: ReferencesFilter,
): boolean {
  return (
    filterIndustry !== '__all__' ||
    filterEmployeeBand !== 'any' ||
    filterReferences !== 'any'
  )
}

export function companyHref(
  companyId: string,
  isPartnerView: boolean,
  opts?: { edit?: boolean },
): string {
  let href = accountsDetailHref(companyId, isPartnerView ? 'partner' : 'account')
  if (opts?.edit) {
    href += `${href.includes('?') ? '&' : '?'}edit=1`
  }
  return href
}

export function filterAndSortCompanies(
  companies: CompanyCard[],
  opts: {
    search: string
    favoritesOnly: boolean
    sortMode: SortMode
    filterIndustry: string
    filterEmployeeBand: EmployeeBand
    filterReferences: ReferencesFilter
  },
): CompanyCard[] {
  const q = opts.search.trim().toLowerCase()
  let list = companies
  if (opts.favoritesOnly) {
    list = list.filter((c) => c.is_favorite)
  }
  if (opts.filterIndustry !== '__all__') {
    list = list.filter((c) => resolveIndustryId(c.industry) === opts.filterIndustry)
  }
  if (opts.filterEmployeeBand !== 'any') {
    const band = opts.filterEmployeeBand
    list = list.filter((c) => {
      const count = c.employee_count
      if (band === 'unknown') return count == null || !Number.isFinite(count)
      if (count == null || !Number.isFinite(count)) return false
      const n = count
      if (band === 's_50') return n >= 1 && n <= 50
      if (band === 'm_200') return n >= 51 && n <= 200
      if (band === 'l_1000') return n >= 201 && n <= 1000
      return n >= 1001
    })
  }
  if (opts.filterReferences === 'with') {
    list = list.filter((c) => (c.reference_count ?? 0) > 0)
  } else if (opts.filterReferences === 'without') {
    list = list.filter((c) => (c.reference_count ?? 0) === 0)
  }
  const searched = !q
    ? list
    : list.filter((c) => {
        const name = (c.name ?? '').toLowerCase()
        const industry = formatIndustryDisplay(c.industry).toLowerCase()
        return name.includes(q) || industry.includes(q)
      })
  return [...searched].sort((a, b) => {
    if (opts.sortMode === 'az')
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de')
    const rankA = accountStatusSortRank(a.account_status)
    const rankB = accountStatusSortRank(b.account_status)
    if (rankA !== rankB) return rankA - rankB
    const urgencyA = nextUrgencySortKey([a.sort_urgency_at, a.primary_action?.date])
    const urgencyB = nextUrgencySortKey([b.sort_urgency_at, b.primary_action?.date])
    if (urgencyA !== urgencyB) return urgencyA - urgencyB
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de')
  })
}
