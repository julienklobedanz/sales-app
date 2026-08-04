import type { PartnerCategory } from '@/lib/accounts/company-entity'

export const COMPANIES_IMPORT_NAME_KEYS = [
  'name',
  'Name',
  'account',
  'Account',
  'unternehmen',
  'Unternehmen',
] as const

export const COMPANIES_IMPORT_WEBSITE_KEYS = [
  'website',
  'Website',
  'domain',
  'Domain',
] as const

export const COMPANIES_IMPORT_INDUSTRY_KEYS = [
  'industry',
  'Industry',
  'branche',
  'Branche',
] as const

export const COMPANIES_IMPORT_HEADQUARTERS_KEYS = [
  'headquarters',
  'Headquarters',
  'hq',
  'HQ',
  'standort',
  'Standort',
] as const

export const COMPANIES_IMPORT_EMPLOYEE_KEYS = [
  'employee_count',
  'Employee Count',
  'employees',
  'Employees',
  'mitarbeiter',
  'Mitarbeiter',
] as const

export const COMPANIES_IMPORT_PARTNER_CATEGORY_KEYS = [
  'partner_category',
  'Partner Category',
  'Kategorie',
  'kategorie',
  'category',
  'Category',
] as const

export function pickSheetRowValue(
  row: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = String(row[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

export function parseEmployeeCountFromImport(raw: string): number | null {
  if (!raw.trim()) return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizePartnerCategoryFromImport(raw: string): PartnerCategory {
  const t = raw.trim().toLowerCase()
  if (t === 'sub' || t === 'subunternehmer') return 'sub'
  if (t === 'tech' || t === 'technologie') return 'tech'
  if (t === 'legal' || t === 'recht') return 'legal'
  if (t === 'other' || t === 'sonstiges') return 'other'
  return 'other'
}

export type ParsedCompaniesImportRow = {
  name: string
  website: string
  industry: string
  headquarters: string
  employeeCount: number | null
  partnerCategory: PartnerCategory | null
}

export function parseCompaniesImportRow(
  row: Record<string, unknown>,
  entityKind: 'account' | 'partner',
): ParsedCompaniesImportRow | null {
  const name = pickSheetRowValue(row, COMPANIES_IMPORT_NAME_KEYS)
  if (!name) return null

  const employeeRaw = pickSheetRowValue(row, COMPANIES_IMPORT_EMPLOYEE_KEYS)
  const partnerCategoryRaw = pickSheetRowValue(
    row,
    COMPANIES_IMPORT_PARTNER_CATEGORY_KEYS,
  )

  return {
    name,
    website: pickSheetRowValue(row, COMPANIES_IMPORT_WEBSITE_KEYS),
    industry: pickSheetRowValue(row, COMPANIES_IMPORT_INDUSTRY_KEYS),
    headquarters: pickSheetRowValue(row, COMPANIES_IMPORT_HEADQUARTERS_KEYS),
    employeeCount: parseEmployeeCountFromImport(employeeRaw),
    partnerCategory:
      entityKind === 'partner'
        ? normalizePartnerCategoryFromImport(partnerCategoryRaw || 'other')
        : null,
  }
}
