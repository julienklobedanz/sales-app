import type { PartnerCategory } from '@/lib/accounts/account-entity'

const ACCOUNTS_IMPORT_NAME_KEYS = [
  'name',
  'Name',
  'account',
  'Account',
  'unternehmen',
  'Unternehmen',
] as const

const ACCOUNTS_IMPORT_WEBSITE_KEYS = [
  'website',
  'Website',
  'domain',
  'Domain',
] as const

const ACCOUNTS_IMPORT_INDUSTRY_KEYS = [
  'industry',
  'Industry',
  'branche',
  'Branche',
] as const

const ACCOUNTS_IMPORT_HEADQUARTERS_KEYS = [
  'headquarters',
  'Headquarters',
  'hq',
  'HQ',
  'standort',
  'Standort',
] as const

const ACCOUNTS_IMPORT_EMPLOYEE_KEYS = [
  'employee_count',
  'Employee Count',
  'employees',
  'Employees',
  'mitarbeiter',
  'Mitarbeiter',
] as const

const ACCOUNTS_IMPORT_PARTNER_CATEGORY_KEYS = [
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

export type ParsedAccountsImportRow = {
  name: string
  website: string
  industry: string
  headquarters: string
  employeeCount: number | null
  partnerCategory: PartnerCategory | null
}

export function parseAccountsImportRow(
  row: Record<string, unknown>,
  entityKind: 'account' | 'partner',
): ParsedAccountsImportRow | null {
  const name = pickSheetRowValue(row, ACCOUNTS_IMPORT_NAME_KEYS)
  if (!name) return null

  const employeeRaw = pickSheetRowValue(row, ACCOUNTS_IMPORT_EMPLOYEE_KEYS)
  const partnerCategoryRaw = pickSheetRowValue(
    row,
    ACCOUNTS_IMPORT_PARTNER_CATEGORY_KEYS,
  )

  return {
    name,
    website: pickSheetRowValue(row, ACCOUNTS_IMPORT_WEBSITE_KEYS),
    industry: pickSheetRowValue(row, ACCOUNTS_IMPORT_INDUSTRY_KEYS),
    headquarters: pickSheetRowValue(row, ACCOUNTS_IMPORT_HEADQUARTERS_KEYS),
    employeeCount: parseEmployeeCountFromImport(employeeRaw),
    partnerCategory:
      entityKind === 'partner'
        ? normalizePartnerCategoryFromImport(partnerCategoryRaw || 'other')
        : null,
  }
}
