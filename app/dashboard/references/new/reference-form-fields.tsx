'use client'

/**
 * Thin dashboard re-export: binds company search to server actions.
 * Canonical UI lives in `lib/references/reference-form/reference-form-fields.tsx`.
 */

import {
  CompanyCombobox as CompanyComboboxBase,
  FileDropZone,
  LogoDropZone,
  MagicImportDropzone,
} from '@/lib/references/reference-form/reference-form-fields'
import type { ReferenceFormCompany } from '@/lib/references/reference-form/reference-form-types'
import { searchCompanySuggestions } from './actions'

export type { ReferenceFormCompany }
export { FileDropZone, LogoDropZone, MagicImportDropzone }

type ComboboxProps = Parameters<typeof CompanyComboboxBase>[0]

export function CompanyCombobox({
  searchCompanies = searchCompanySuggestions,
  ...props
}: ComboboxProps) {
  return <CompanyComboboxBase searchCompanies={searchCompanies} {...props} />
}
