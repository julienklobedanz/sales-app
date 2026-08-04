'use server'

import type { ExtractDataFromDocumentResult } from './types'
import type {
  CompanySearchResult,
  CreateReferenceResult,
  EnrichCompanyResult,
  ExternalContact,
  FetchEnrichmentResult,
} from './reference-new-action-types'
import {
  enrichAndSaveCompanyImpl,
  fetchCompanyEnrichmentImpl,
  searchCompanySuggestionsImpl,
} from './company-search-enrich-impl'
import {
  attachOriginalDocumentToReferenceImpl,
  createReferenceImpl,
  extractReferenceDocumentFromUploadImpl,
} from './create-reference-impl'
import {
  createContactImpl,
  createExternalContactImpl,
  updateContactImpl,
  updateExternalContactImpl,
} from './reference-contacts-impl'

export type {
  EnrichCompanyResult,
  FetchEnrichmentResult,
  CompanySearchSuggestion,
  CompanySearchResult,
  CreateReferenceResult,
  ExternalContact,
} from './reference-new-action-types'

/** Sucht Unternehmensvorschläge für die Combobox (lokal in der Organisation + Brandfetch). */
export async function searchCompanySuggestions(input: string): Promise<CompanySearchResult> {
  return searchCompanySuggestionsImpl(input)
}

/** Server Action: KI-Import aus PDF/DOCX/PPTX (für das Referenz-Formular im Client). */
export async function extractReferenceDocumentFromUpload(
  formData: FormData
): Promise<ExtractDataFromDocumentResult> {
  return extractReferenceDocumentFromUploadImpl(formData)
}

export async function enrichAndSaveCompany(domain: string): Promise<EnrichCompanyResult> {
  return enrichAndSaveCompanyImpl(domain)
}

/** Nur Brandfetch-Daten abrufen (kein Speichern in DB). Für Referenz bearbeiten. */
export async function fetchCompanyEnrichment(input: string): Promise<FetchEnrichmentResult> {
  return fetchCompanyEnrichmentImpl(input)
}

export async function createReference(
  formData: FormData
): Promise<CreateReferenceResult> {
  return createReferenceImpl(formData)
}

export async function attachOriginalDocumentToReference(params: {
  referenceId: string
  file_path: string
  original_document_url: string | null
  file_name?: string | null
  file_type?: string | null
}): Promise<{ success: true } | { success: false; error: string }> {
  return attachOriginalDocumentToReferenceImpl(params)
}

export async function createContact(formData: FormData) {
  return createContactImpl(formData)
}

export async function createExternalContact(
  formData: FormData
): Promise<{ success: false; error: string } | { success: true; contact: ExternalContact }> {
  return createExternalContactImpl(formData)
}

export async function updateContact(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  return updateContactImpl(id, formData)
}

export async function updateExternalContact(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  return updateExternalContactImpl(id, formData)
}
