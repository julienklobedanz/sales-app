import type { OrgDateDisplayFormat } from '@/lib/format'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'

/** Muss mit COLUMN_KEYS in reference-overview-columns übereinstimmen */
export type ReferenceColumnKey =
  | 'company'
  | 'title'
  | 'industry'
  | 'volume_eur'
  | 'status'
  | 'project_status'
  | 'updated_at'
  | 'tags'
  | 'country'
  | 'project_start'
  | 'project_end'
  | 'duration_months'
  | 'created_at'

export const DEFAULT_REFERENCE_COLUMN_WIDTHS: Record<ReferenceColumnKey, number> = {
  company: 180,
  title: 280,
  industry: 108,
  volume_eur: 110,
  status: 104,
  project_status: 140,
  updated_at: 130,
  tags: 120,
  country: 110,
  project_start: 120,
  project_end: 120,
  duration_months: 110,
  created_at: 130,
}

export type ReferenceTableHeaderRenderContext = {
  dragOverColumn: string | null
  setDragOverColumn: (key: string | null) => void
  moveColumnOrder: (from: string, to: string) => void
  columnWidths: Record<ReferenceColumnKey, number>
  onColumnWidthChange: (column: ReferenceColumnKey, width: number) => void
  COLUMN_LABELS: Record<ReferenceColumnKey, string>
  STATUS_LABELS: Record<string, string>
  filterOptions: {
    statuses: string[]
    industries: string[]
    countries: string[]
    projectStatuses: string[]
    companies: string[]
    tags: string[]
  }
  companyFilter: string
  setCompanyFilter: (v: string) => void
  companySearch: string
  setCompanySearch: (v: string) => void
  tagsFilter: string
  setTagsFilter: (v: string) => void
  tagsSearch: string
  setTagsSearch: (v: string) => void
  industryFilter: string
  setIndustryFilter: (v: string) => void
  industrySearch: string
  setIndustrySearch: (v: string) => void
  countryFilter: string
  setCountryFilter: (v: string) => void
  countrySearch: string
  setCountrySearch: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  projectStatusFilter: string
  setProjectStatusFilter: (v: string) => void
  projectStatusSearch: string
  setProjectStatusSearch: (v: string) => void
  volumeFilter: ReferenceVolumeFilter
  setVolumeFilter: (v: ReferenceVolumeFilter) => void
  sortKey: ReferenceColumnKey | null
  sortDir: 'asc' | 'desc'
  handleSort: (column: ReferenceColumnKey) => void
}

export type ReferenceTableCellRenderContext = {
  PROJECT_STATUS_LABELS: Record<string, string>
  companyLogoById: Map<string, string>
  companyIndustryById: Map<string, string>
  orgDateDisplayFormat?: OrgDateDisplayFormat | string
  columnWidths: Record<ReferenceColumnKey, number>
}
