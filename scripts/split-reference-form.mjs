/**
 * One-time splitter: reads reference-form backup and writes lib modules.
 * Run: node scripts/split-reference-form.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const srcPath = path.join(root, 'lib/references/reference-form/reference-form.tsx.bak')
const outDir = path.join(root, 'lib/references/reference-form')
const src = fs.readFileSync(srcPath, 'utf8')
const lines = src.split('\n')

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n')
}

function write(name, content) {
  const file = path.join(outDir, name)
  fs.writeFileSync(file, content.trimStart() + '\n')
  console.log('wrote', name, fs.statSync(file).size)
}

// --- small modules (manual headers) ---
write(
  'reference-form-types.ts',
  `import type { ReferenceFormCompany } from '@/app/dashboard/references/new/reference-form-fields'

export type { ReferenceFormCompany }

export type ContactPerson = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

/** Für Dropdown Kundenansprechpartner (externer Kontakt mit optionaler Rolle). */
export type ExternalContactDisplay = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role?: string | null
  company_id?: string
  phone?: string | null
}

export type ReferenceFormStatus = 'draft' | 'internal_only' | 'approved' | 'anonymized'

export type ReferenceFormInitialData = {
  id: string
  company_id: string
  company_name: string
  company_logo_url?: string | null
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  website?: string | null
  employee_count?: number | null
  volume_eur?: string | null
  contract_type?: string | null
  incumbent_provider?: string | null
  competitors?: string | null
  customer_challenge?: string | null
  our_solution?: string | null
  customer_contact?: string | null
  customer_contact_id?: string | null
  contact_id?: string | null
  status: ReferenceFormStatus
  file_path?: string | null
  tags?: string | null
  project_status?: 'active' | 'completed' | null
  project_start?: string | null
  project_end?: string | null
  is_nda_deal?: boolean
}

export type ReferenceFormCompanyOption = ReferenceFormCompany
`
)

write(
  'reference-form-pure.ts',
  `${slice(77, 122)}

export function normalizeContactIdentity(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .join('|')
}

export function normalizeTag(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed === trimmed.toUpperCase() && /[A-ZÄÖÜ]/.test(trimmed)) {
    return trimmed
  }
  const lower = trimmed.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function parseInitialTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  const seen = new Set<string>()
  const result: string[] = []
  tags
    .split(/[\\s,;]+/)
    .map((s) => normalizeTag(s))
    .filter(Boolean)
    .forEach((t) => {
      if (!seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase())
        result.push(t)
      }
    })
  return result
}

export function formatZodError(error: import('zod').ZodError): string {
  return (
    error.issues.map((i) => i.message).join(' · ') || 'Bitte Pflichtfelder ausfüllen.'
  )
}

export function dedupeContacts<T extends { id: string; first_name: string | null; last_name: string | null; email: string | null }>(
  contacts: T[]
): T[] {
  const seenContactIds = new Set<string>()
  const seenContactIdentities = new Set<string>()
  return contacts.filter((c) => {
    const identity = normalizeContactIdentity([c.first_name, c.last_name, c.email])
    if (identity !== '||' && seenContactIdentities.has(identity)) return false
    if (seenContactIds.has(c.id)) return false
    if (identity !== '||') seenContactIdentities.add(identity)
    seenContactIds.add(c.id)
    return true
  })
}

export function dedupeCustomerContacts<T extends { id: string }>(contacts: T[]): T[] {
  const seenCustomerIds = new Set<string>()
  return contacts.filter((c) => {
    if (seenCustomerIds.has(c.id)) return false
    seenCustomerIds.add(c.id)
    return true
  })
}
`
)

write(
  'reference-form-constants.ts',
  `import type { ReferenceFormStatus } from '@/lib/references/reference-form/reference-form-types'

${slice(124, 169).replace('ReferenceFormInitialData', 'ReferenceFormStatus')}
`
)

write(
  'reference-form-labels.tsx',
  `'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Label } from '@/components/ui/label'

type BaseLabelProps = ComponentProps<typeof Label>

${slice(228, 258)}
`
)

write(
  'reference-form-schema.ts',
  `import { z } from 'zod'
import { REFERENCE_NARRATIVE_MAX_CHARS } from '@/lib/references/reference-narrative-limits'
import { formatZodError } from '@/lib/references/reference-form/reference-form-pure'

export { formatZodError }

const narrativeMaxMsg = (label: string) =>
  \`\${label}: höchstens \${REFERENCE_NARRATIVE_MAX_CHARS} Zeichen.\`

export const requiredSchema = z
  .object({
    title: z.string().trim().min(1, 'Titel ist ein Pflichtfeld.'),
    companyId: z.string().optional(),
    newCompanyName: z.string().optional(),
    summary: z
      .string()
      .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Zusammenfassung')),
    customerChallenge: z
      .string()
      .trim()
      .min(1, 'Herausforderung ist ein Pflichtfeld.')
      .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Herausforderung')),
    ourSolution: z
      .string()
      .trim()
      .min(1, 'Lösung ist ein Pflichtfeld.')
      .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Lösung')),
  })
  .superRefine((val, ctx) => {
    const hasCompany =
      Boolean((val.companyId ?? '').trim()) || Boolean((val.newCompanyName ?? '').trim())
    if (!hasCompany) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unternehmen ist ein Pflichtfeld.',
        path: ['companyId'],
      })
    }
  })

export const editRequiredSchema = z.object({
  title: z.string().trim().min(1, 'Titel ist ein Pflichtfeld.'),
  editCompanyName: z.string().trim().min(1, 'Unternehmen ist ein Pflichtfeld.'),
  summary: z
    .string()
    .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Zusammenfassung')),
  customerChallenge: z
    .string()
    .trim()
    .min(1, 'Herausforderung ist ein Pflichtfeld.')
    .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Herausforderung')),
  ourSolution: z
    .string()
    .trim()
    .min(1, 'Lösung ist ein Pflichtfeld.')
    .max(REFERENCE_NARRATIVE_MAX_CHARS, narrativeMaxMsg('Lösung')),
})
`
)

write(
  'reference-form-form-data.ts',
  `import { parseGermanEmployeeCountInput } from '@/lib/format'
import type { ExternalContactDisplay, ReferenceFormInitialData } from '@/lib/references/reference-form/reference-form-types'

export type ReferenceFormSharedFieldState = {
  title: string
  summary: string
  industry: string
  country: string
  employeeCount: string
  website: string
  headquarters: string
  brandfetchLogoUrl: string
  customerChallenge: string
  ourSolution: string
  contactId: string
  customer_contact_id: string
  displayCustomerContacts: ExternalContactDisplay[]
  projectStatus: string
  projectStart: string
  projectEnd: string
  volumeEur: string
  volumeCurrency: string
  contractType: string
  incumbentProvider: string
  competitors: string
  status: ReferenceFormInitialData['status']
  ndaDeal: boolean
  tags: string[]
}

export function appendSharedReferenceFields(fd: FormData, state: ReferenceFormSharedFieldState) {
  fd.set('title', state.title.trim())
  fd.set('summary', state.summary.trim())
  fd.set('industry', state.industry)
  fd.set('country', state.country)
  const ec = parseGermanEmployeeCountInput(state.employeeCount)
  fd.set('employee_count', ec != null ? String(ec) : '')
  fd.set('website', state.website.trim())
  fd.set('company_headquarters', state.headquarters.trim())
  fd.set('company_logo_url', state.brandfetchLogoUrl.trim())
  fd.set('customer_challenge', state.customerChallenge)
  fd.set('our_solution', state.ourSolution)
  fd.set('contactId', state.contactId === '__none__' ? '' : state.contactId)
  fd.set('customer_contact_id', state.customer_contact_id === '__none__' ? '' : state.customer_contact_id)
  const selectedCustomer = state.displayCustomerContacts.find((c) => c.id === state.customer_contact_id)
  const customerDisplay = selectedCustomer
    ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') +
      (selectedCustomer.role ? \`, \${selectedCustomer.role}\` : '')
    : ''
  fd.set('customer_contact', customerDisplay)
  fd.set('project_status', state.projectStatus === '__none__' ? '' : state.projectStatus)
  fd.set('project_start', state.projectStart)
  fd.set('project_end', state.projectStatus === 'active' ? '' : state.projectEnd)
  if (state.volumeEur) {
    fd.set('volume_eur', \`\${state.volumeCurrency} \${state.volumeEur.replace(/\\./g, '')}\`)
  }
  fd.set('contract_type', state.contractType)
  fd.set('incumbent_provider', state.incumbentProvider)
  fd.set('competitors', state.competitors)
  fd.set('status', state.status)
  fd.set('nda_deal', state.ndaDeal ? '1' : '0')
  fd.set('tags', state.tags.join(','))
}

export function buildFormDataCreate(
  shared: ReferenceFormSharedFieldState,
  companyId: string,
  newCompanyName: string
): FormData {
  const fd = new FormData()
  appendSharedReferenceFields(fd, shared)
  fd.set('companyId', companyId)
  fd.set('newCompanyName', newCompanyName.trim())
  return fd
}

export function buildFormDataEdit(shared: ReferenceFormSharedFieldState, editCompanyName: string): FormData {
  const fd = new FormData()
  appendSharedReferenceFields(fd, shared)
  fd.set('company_name', editCompanyName.trim())
  return fd
}
`
)

// Extract renderFormContent body (lines 818-1765) -> component
const contentBody = slice(818, 1765)
  .replace(/^  function renderFormContent\(\) \{\n/, '')
  .replace(/\n  \}\n$/, '')

const contentVars = `  const {
    isEditMode,
    initialData,
    submitting,
    companyId,
    setCompanyId,
    title,
    setTitle,
    summary,
    setSummary,
    industry,
    setIndustry,
    country,
    setCountry,
    website,
    setWebsite,
    employeeCount,
    setEmployeeCount,
    volumeEur,
    setVolumeEur,
    volumeCurrency,
    setVolumeCurrency,
    contractType,
    setContractType,
    incumbentProvider,
    setIncumbentProvider,
    competitors,
    setCompetitors,
    customerChallenge,
    setCustomerChallenge,
    ourSolution,
    setOurSolution,
    status,
    setStatus,
    ndaDeal,
    setNdaDeal,
    statusBeforeNdaRef,
    contactId,
    setContactId,
    displayContacts,
    customer_contact_id,
    setCustomerContactId,
    displayCustomerContacts,
    editingInternalContact,
    setEditingInternalContact,
    editingCustomerContact,
    setEditingCustomerContact,
    handleContactCreated,
    handleCustomerContactCreated,
    tags,
    setTags,
    tagInputValue,
    setTagInputValue,
    competitorInputValue,
    setCompetitorInputValue,
    incumbentInputValue,
    setIncumbentInputValue,
    incumbentSuggestions,
    setIncumbentSuggestions,
    competitorSuggestions,
    setCompetitorSuggestions,
    projectStatus,
    setProjectStatus,
    projectStart,
    setProjectStart,
    projectEnd,
    setProjectEnd,
    selectedFile,
    setSelectedFile,
    newCompanyName,
    setNewCompanyName,
    enrichLoading,
    editCompanyName,
    setEditCompanyName,
    setEnrichedCompany,
    setBrandfetchLogoUrl,
    magicImportLoading,
    summaryLoading,
    setSummaryLoading,
    displayCompanies,
    currentCompanyId,
    currentCompanyNameForAvatar,
    applyBrandfetchPreview,
    handleMagicImport,
    normalizeTag,
    setAdditionalContacts,
    setAdditionalCustomerContacts,
  } = props

`

write(
  'reference-form-content.tsx',
  `'use client'

/* eslint-disable @next/next/no-img-element */

import { Email, Loader, Phone, Sparkles } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import { IndustrySelect } from '@/components/forms/industry-select'
import { AppIcon } from '@/lib/icons'
import { REFERENCE_NARRATIVE_MAX_CHARS } from '@/lib/references/reference-narrative-limits'
import {
  CONTRACT_TYPE_GROUPS,
  CONTRACT_TYPE_VALUES,
  formatContractTypeDisplay,
} from '@/lib/references/contract-type'
import {
  COUNTRIES,
  PROJECT_STATUS_OPTIONS,
  STATUS_HELP_TEXT,
  STATUS_OPTIONS,
  VOLUME_CURRENCY_OPTIONS,
} from '@/lib/references/reference-form/reference-form-constants'
import { RequiredLabel, OptionalLabel } from '@/lib/references/reference-form/reference-form-labels'
import { normalizeTag } from '@/lib/references/reference-form/reference-form-pure'
import type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import {
  CompanyCombobox,
  FileDropZone,
  MagicImportDropzone,
} from '@/app/dashboard/references/new/reference-form-fields'
import { CreateContactDialog } from '@/app/dashboard/references/new/create-contact-dialog'
import { generateSummaryFromStory, getCompetitorSuggestions, getIncumbentSuggestions } from '@/app/dashboard/actions'

export function ReferenceFormContent(props: ReferenceFormViewModel) {
${contentVars}${contentBody}
}
`
)

// Hook: state + handlers without form-data/schema blocks
const hookPart1 = slice(281, 346)
const hookPart2 = slice(356, 508)
const hookPart3 = slice(617, 808)
  .replace(
    /  function buildFormDataCreate\(\): FormData \{[\s\S]*?  \}\n\n/,
    ''
  )
  .replace(
    /  const narrativeMaxMsg[\s\S]*?  \}\)\n\n/,
    ''
  )
const hookBody = [hookPart1, hookPart2, hookPart3]
  .join('\n')
  .replace(/^  const router = useRouter\(\)\n/, '')
  .replace(
    /  const \[tags, setTags\] = useState<string\[\]>\(\(\) => \{[\s\S]*?  \}\)/,
    '  const [tags, setTags] = useState<string[]>(() => parseInitialTags(initialData?.tags))'
  )
  .replace(
    /  const normalizeTag = \(raw: string\): string => \{[\s\S]*?  \}\n/,
    ''
  )
  .replace(
    /  const contactsRaw = \[\.\.\.contacts, \.\.\.additionalContacts\]\n  const seenContactIds[\s\S]*?  \}\)\n/,
    '  const contactsRaw = [...contacts, ...additionalContacts]\n  const displayContacts = dedupeContacts(contactsRaw)\n'
  )
  .replace(
    /  const customerContactsRaw[\s\S]*?  \}\)\n\n/,
    `  const customerContactsRaw: ExternalContactDisplay[] = [
    ...externalContacts.filter((c) => c.company_id === currentCompanyId),
    ...additionalCustomerContacts,
  ]
  const displayCustomerContacts = dedupeCustomerContacts(customerContactsRaw)

`
  )
  .replace(
    /      const result = await createReference\(buildFormDataCreate\(\)\)/,
    '      const result = await createReference(buildFormDataCreate(getSharedFieldState(), companyId, newCompanyName))'
  )
  .replace(
    /      await updateReference\(initialData\.id, buildFormDataEdit\(\)\)/,
    '      await updateReference(initialData.id, buildFormDataEdit(getSharedFieldState(), editCompanyName))'
  )
  .replace(
    /  async function handleCreateSubmit/,
    `  function getSharedFieldState(): ReferenceFormSharedFieldState {
    return {
      title,
      summary,
      industry,
      country,
      employeeCount,
      website,
      headquarters,
      brandfetchLogoUrl,
      customerChallenge,
      ourSolution,
      contactId,
      customer_contact_id,
      displayCustomerContacts,
      projectStatus,
      projectStart,
      projectEnd,
      volumeEur,
      volumeCurrency,
      contractType,
      incumbentProvider,
      competitors,
      status,
      ndaDeal,
      tags,
    }
  }

  async function handleCreateSubmit`
  )
  .replace(
    /    } catch \(err\) \{\n      toast\.error\(err instanceof Error \? err\.message : 'Fehler beim Anlegen'\)\n    \}/,
    `    } catch (err) {
      log.error('reference create failed', { action: 'createReference' }, err)
      toast.error(err instanceof Error ? err.message : 'Fehler beim Anlegen')
    }`
  )
  .replace(
    /    } catch \(err\) \{\n      toast\.error\(err instanceof Error \? err\.message : 'Fehler beim Speichern'\)\n    \}/,
    `    } catch (err) {
      log.error('reference update failed', { action: 'updateReference', referenceId: initialData.id }, err)
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    }`
  )

write(
  'use-reference-form.ts',
  `'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from 'sonner'
import { z } from 'zod'
import { attachOriginalDocumentToReference, createReference, fetchCompanyEnrichment } from '@/app/dashboard/references/new/actions'
import type { ExtractDataFromDocumentResult } from '@/app/dashboard/references/new/types'
import type { ExternalContact } from '@/app/dashboard/references/new/actions'
import { CreateContactDialog, type CreatedContact } from '@/app/dashboard/references/new/create-contact-dialog'
import type { ReferenceFormCompany } from '@/app/dashboard/references/new/reference-form-fields'
import { updateReference } from '@/app/dashboard/actions'
import { resolveIndustryId } from '@/lib/constants/industries'
import { syncCompanyBrandfetchForEdit } from '@/lib/evidence/sync-company-brandfetch'
import { log } from '@/lib/observability/logger'
import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import {
  formatEmployeeCountDeDisplay,
  parseReferenceVolume,
} from '@/lib/format'
import {
  buildFormDataCreate,
  buildFormDataEdit,
  type ReferenceFormSharedFieldState,
} from '@/lib/references/reference-form/reference-form-form-data'
import {
  dedupeContacts,
  dedupeCustomerContacts,
  formatThousandsDots,
  looksLikeProxyOrNetworkFailure,
  normalizeWrappedParagraphs,
  parseInitialTags,
} from '@/lib/references/reference-form/reference-form-pure'
import { editRequiredSchema, formatZodError, requiredSchema } from '@/lib/references/reference-form/reference-form-schema'
import type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'

type Company = ReferenceFormCompany

export type UseReferenceFormArgs = {
  companies?: Company[]
  contacts?: ContactPerson[]
  externalContacts?: ExternalContact[]
  initialData?: ReferenceFormInitialData
  onSuccess?: () => void
  router: AppRouterInstance
}

export type ReferenceFormViewModel = ReturnType<typeof useReferenceForm>

export function useReferenceForm({
  companies = [],
  contacts = [],
  externalContacts = [],
  initialData,
  onSuccess,
  router,
}: UseReferenceFormArgs) {
${hookBody}

  return {
    isEditMode,
    initialData,
    submitting,
    formId,
    companyId,
    setCompanyId,
    title,
    setTitle,
    summary,
    setSummary,
    industry,
    setIndustry,
    country,
    setCountry,
    headquarters,
    setHeadquarters,
    brandfetchLogoUrl,
    setBrandfetchLogoUrl,
    website,
    setWebsite,
    employeeCount,
    setEmployeeCount,
    volumeEur,
    setVolumeEur,
    volumeCurrency,
    setVolumeCurrency,
    contractType,
    setContractType,
    incumbentProvider,
    setIncumbentProvider,
    competitors,
    setCompetitors,
    customerChallenge,
    setCustomerChallenge,
    ourSolution,
    setOurSolution,
    status,
    setStatus,
    ndaDeal,
    setNdaDeal,
    statusBeforeNdaRef,
    contactId,
    setContactId,
    displayContacts,
    customer_contact_id,
    setCustomerContactId,
    displayCustomerContacts,
    editingInternalContact,
    setEditingInternalContact,
    editingCustomerContact,
    setEditingCustomerContact,
    handleContactCreated,
    handleCustomerContactCreated,
    tags,
    setTags,
    tagInputValue,
    setTagInputValue,
    competitorInputValue,
    setCompetitorInputValue,
    incumbentInputValue,
    setIncumbentInputValue,
    incumbentSuggestions,
    setIncumbentSuggestions,
    competitorSuggestions,
    setCompetitorSuggestions,
    projectStatus,
    setProjectStatus,
    projectStart,
    setProjectStart,
    projectEnd,
    setProjectEnd,
    selectedFile,
    setSelectedFile,
    newCompanyName,
    setNewCompanyName,
    enrichLoading,
    editCompanyName,
    setEditCompanyName,
    setEnrichedCompany,
    setBrandfetchLogoUrl,
    magicImportLoading,
    summaryLoading,
    setSummaryLoading,
    displayCompanies,
    currentCompanyId,
    currentCompanyNameForAvatar,
    applyBrandfetchPreview,
    handleCreateSubmit,
    handleEditSubmit,
    handleMagicImport,
    normalizeTag,
    setAdditionalContacts,
    setAdditionalCustomerContacts,
  }
}
`
)

write(
  'reference-form.tsx',
  `'use client'

import { useRouter } from 'next/navigation'
import { CirclePlus } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { ReferenceFormContent } from '@/lib/references/reference-form/reference-form-content'
import { useReferenceForm } from '@/lib/references/reference-form/use-reference-form'
import type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'
import type { ReferenceFormCompany } from '@/app/dashboard/references/new/reference-form-fields'
import type { ExternalContact } from '@/app/dashboard/references/new/actions'

type Company = ReferenceFormCompany

export type { ContactPerson, ExternalContactDisplay, ReferenceFormInitialData }

export function ReferenceForm({
  companies = [],
  contacts = [],
  externalContacts = [],
  initialData,
  onSuccess,
  onClose,
  layout = 'page',
}: {
  companies?: Company[]
  contacts?: ContactPerson[]
  externalContacts?: ExternalContact[]
  initialData?: ReferenceFormInitialData
  onSuccess?: () => void
  onClose?: () => void
  layout?: 'page' | 'dialog'
}) {
  const router = useRouter()
  const vm = useReferenceForm({
    companies,
    contacts,
    externalContacts,
    initialData,
    onSuccess,
    router,
  })

  const actionBar = (
    <div
      className={
        layout === 'dialog'
          ? 'shrink-0 border-t border-border/80 bg-background px-4 py-3 shadow-[0_-4px_12px_-4px_rgba(15,23,42,0.08)]'
          : 'sticky bottom-0 z-40 mt-6 border-t bg-background/80 backdrop-blur'
      }
    >
      <div className="flex items-center justify-end gap-3 px-0 sm:px-1">
        <Button
          type="button"
          variant="outline"
          disabled={vm.submitting}
          onClick={() => (onClose ? onClose() : router.push(ROUTES.home))}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          form={vm.formId}
          disabled={vm.submitting}
          className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
        >
          <AppIcon icon={CirclePlus} size={16} className="mr-2" />
          Speichern
        </Button>
      </div>
    </div>
  )

  const formInnerClass = 'w-full min-w-0 space-y-6 pb-2'
  const contentProps = { ...vm, layout }

  return (
    <div
      className={
        layout === 'dialog'
          ? 'flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden'
          : 'w-full max-w-4xl min-w-0 pb-6'
      }
    >
      {layout === 'dialog' ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-0">
            {vm.isEditMode ? (
              <form id={vm.formId} noValidate onSubmit={vm.handleEditSubmit} className={formInnerClass}>
                <ReferenceFormContent {...contentProps} />
              </form>
            ) : (
              <form id={vm.formId} noValidate onSubmit={vm.handleCreateSubmit} className={formInnerClass}>
                <ReferenceFormContent {...contentProps} />
              </form>
            )}
          </div>
          {actionBar}
        </>
      ) : (
        <>
          {vm.isEditMode ? (
            <form id={vm.formId} noValidate onSubmit={vm.handleEditSubmit} className={formInnerClass}>
              <ReferenceFormContent {...contentProps} />
            </form>
          ) : (
            <form id={vm.formId} noValidate onSubmit={vm.handleCreateSubmit} className={formInnerClass}>
              <ReferenceFormContent {...contentProps} />
            </form>
          )}
          {actionBar}
        </>
      )}
    </div>
  )
}
`
)

write(
  path.join(root, 'app/dashboard/references/new/reference-form.tsx'),
  `'use client'

export type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'

export { ReferenceForm } from '@/lib/references/reference-form/reference-form'
`
)

console.log('done')
