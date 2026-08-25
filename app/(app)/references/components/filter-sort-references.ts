import {
  MASTER_INDUSTRIES,
  getIndustryLabelDe,
  resolveIndustryId,
} from '@/lib/constants/industries'
import { parseReferenceVolume } from '@/lib/format'
import { isReferenceVisibleToSales } from '@/lib/references/sales-reference-visibility'
import {
  matchesReferenceVolumeFilter,
  type ReferenceVolumeFilter,
} from '@/lib/references/reference-volume-filter'
import {
  compareReferencesByProjectYearDesc,
  projectYearFromDates,
} from '@/lib/references/project-year'
import type { ReferenceRow } from '@/app/(app)/actions'
import {
  COLUMN_KEYS,
  REFERENCE_TABLE_STATUS_FILTERS,
  referenceRowShowsApprovalPending,
} from './reference-overview-columns'

export function normalizeTagLabel(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function buildReferenceFilterOptions(
  initialReferences: ReferenceRow[],
  _companyIndustryById: Map<string, string>,
  normalizeTag: (raw: string) => string,
) {
  const countries = new Set<string>()
  const projectStatuses = new Set<string>()
  const companies = new Set<string>()
  const tags = new Set<string>()
  for (const r of initialReferences) {
    if (r.country) countries.add(r.country)
    if (r.project_status) projectStatuses.add(r.project_status)
    if (r.company_name) companies.add(r.company_name)
    if (r.tags) {
      r.tags
        .split(/[\s,]+/)
        .map((t) => normalizeTag(t))
        .filter(Boolean)
        .forEach((t) => tags.add(t))
    }
  }
  return {
    statuses: [...REFERENCE_TABLE_STATUS_FILTERS],
    industries: MASTER_INDUSTRIES.map((item) => item.id),
    countries: Array.from(countries).sort(),
    projectStatuses: Array.from(projectStatuses).sort(),
    companies: Array.from(companies).sort((a, b) => a.localeCompare(b, 'de')),
    tags: Array.from(tags).sort((a, b) => a.localeCompare(b, 'de')),
  }
}

function getReferenceSortValue(
  ref: ReferenceRow,
  key: (typeof COLUMN_KEYS)[number],
  companyIndustryById: Map<string, string>,
): string | number {
  switch (key) {
    case 'status':
      return ref.status
    case 'company':
      return (ref.company_name ?? '').toLowerCase()
    case 'title':
      return (ref.title ?? '').toLowerCase()
    case 'tags':
      return (ref.tags ?? '').toLowerCase()
    case 'industry': {
      const raw =
        String(ref.industry ?? '').trim() ||
        (ref.company_id ? companyIndustryById.get(ref.company_id) : '') ||
        ''
      return getIndustryLabelDe(raw).toLowerCase() || raw.toLowerCase()
    }
    case 'volume_eur': {
      const parsed = parseReferenceVolume(ref.volume_eur)
      return parsed ? Number(parsed.amountDigits) : 0
    }
    case 'country':
      return (ref.country ?? '').toLowerCase()
    case 'project_status':
      return ref.project_status ?? ''
    case 'project_start':
      return ref.project_start ? new Date(ref.project_start).getTime() : 0
    case 'project_end':
      return ref.project_end ? new Date(ref.project_end).getTime() : 0
    case 'duration_months':
      return ref.duration_months ?? 0
    case 'created_at':
      return new Date(ref.created_at).getTime()
    case 'updated_at':
      return ref.updated_at ? new Date(ref.updated_at).getTime() : 0
    case 'summary':
      return (ref.summary ?? '').toLowerCase()
    case 'project_year':
      return projectYearFromDates(ref.project_end, ref.project_start) ?? 0
    default:
      return ''
  }
}

export type FilterAndSortReferencesArgs = {
  references: ReferenceRow[]
  salesAppView: boolean
  favoritesOnly: boolean
  search: string
  statusFilter: string
  companyFilter: string
  tagsFilter: string
  industryFilter: string
  countryFilter: string
  projectStatusFilter: string
  volumeFilter: ReferenceVolumeFilter
  sortKey: (typeof COLUMN_KEYS)[number] | null
  sortDir: 'asc' | 'desc'
  companyIndustryById: Map<string, string>
}

export function filterAndSortReferences({
  references,
  salesAppView,
  favoritesOnly,
  search,
  statusFilter,
  companyFilter,
  tagsFilter,
  industryFilter,
  countryFilter,
  projectStatusFilter,
  volumeFilter,
  sortKey,
  sortDir,
  companyIndustryById,
}: FilterAndSortReferencesArgs): ReferenceRow[] {
  let list = references
  if (salesAppView) {
    list = list.filter((r) => isReferenceVisibleToSales(r.status))
  }
  if (favoritesOnly) {
    list = list.filter((r) => r.is_favorited)
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      (r) =>
        r.company_name.toLowerCase().includes(q) || r.title.toLowerCase().includes(q),
    )
  }
  if (statusFilter !== 'all') {
    if (statusFilter === 'approval_pending') {
      list = list.filter(referenceRowShowsApprovalPending)
    } else {
      list = list.filter(
        (r) => r.status === statusFilter && !referenceRowShowsApprovalPending(r),
      )
    }
  }
  if (companyFilter !== 'all') {
    list = list.filter((r) => r.company_name === companyFilter)
  }
  if (tagsFilter !== 'all') {
    list = list.filter((r) => {
      if (!r.tags) return false
      const tagList = r.tags
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
      return tagList.includes(tagsFilter)
    })
  }
  if (industryFilter !== 'all') {
    list = list.filter((r) => {
      const raw =
        String(r.industry ?? '').trim() ||
        (r.company_id ? companyIndustryById.get(r.company_id) : '') ||
        ''
      return resolveIndustryId(raw) === industryFilter
    })
  }
  if (countryFilter !== 'all') {
    list = list.filter((r) => (r.country ?? '') === countryFilter)
  }
  if (projectStatusFilter !== 'all') {
    list = list.filter((r) => (r.project_status ?? '') === projectStatusFilter)
  }
  if (volumeFilter !== 'all') {
    list = list.filter((r) => matchesReferenceVolumeFilter(r.volume_eur, volumeFilter))
  }
  if (sortKey === 'project_year' && sortDir === 'desc') {
    return [...list].sort(compareReferencesByProjectYearDesc)
  }
  if (sortKey) {
    list = [...list].sort((a, b) => {
      const va = getReferenceSortValue(a, sortKey, companyIndustryById)
      const vb = getReferenceSortValue(b, sortKey, companyIndustryById)
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      const sa = String(va)
      const sb = String(vb)
      const cmp = sa.localeCompare(sb, 'de')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }
  return list
}
