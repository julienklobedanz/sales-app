'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from 'sonner'
import {
  attachOriginalDocumentToReference,
  createReference,
  fetchCompanyEnrichment,
} from '@/app/dashboard/references/new/actions'
import type { ExtractDataFromDocumentResult } from '@/lib/references/extract-types'
import { updateReference } from '@/app/dashboard/actions'
import { resolveIndustryId } from '@/lib/constants/industries'
import { syncCompanyBrandfetchForEdit } from '@/lib/references/library/sync-company-brandfetch'
import { log } from '@/lib/observability/logger'
import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import { formatEmployeeCountDeDisplay, parseReferenceVolume } from '@/lib/format'
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
  normalizeTag,
} from '@/lib/references/reference-form/reference-form-pure'
import {
  editRequiredSchema,
  formatZodError,
  requiredSchema,
} from '@/lib/references/reference-form/reference-form-schema'
import type {
  ContactPerson,
  CreatedContact,
  ExternalContactDisplay,
  ReferenceFormCompany,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'

type Company = ReferenceFormCompany

export type UseReferenceFormArgs = {
  companies?: Company[]
  contacts?: ContactPerson[]
  externalContacts?: ExternalContactDisplay[]
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
  const [editSubmitting, setEditSubmitting] = useState(false)
  const didAutoFormatRef = useRef(false)
  /** Beim Bearbeiten: sonst bleibt '' und Zod blockiert „Unternehmen“ zu Unrecht. */
  const [companyId, setCompanyId] = useState(initialData?.company_id ?? '')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [summary, setSummary] = useState(initialData?.summary ?? '')
  const [industry, setIndustry] = useState(() =>
    resolveIndustryId(initialData?.industry ?? ''),
  )
  const [country, setCountry] = useState(initialData?.country ?? '')
  const [headquarters, setHeadquarters] = useState('')
  const [brandfetchLogoUrl, setBrandfetchLogoUrl] = useState('')
  const [website, setWebsite] = useState(initialData?.website ?? '')
  const [employeeCount, setEmployeeCount] = useState(
    initialData?.employee_count != null
      ? formatEmployeeCountDeDisplay(initialData.employee_count)
      : '',
  )
  const initialVolumeParsed = parseReferenceVolume(initialData?.volume_eur ?? null)
  const [volumeEur, setVolumeEur] = useState(() =>
    formatThousandsDots(initialVolumeParsed?.amountDigits ?? ''),
  )
  const [volumeCurrency, setVolumeCurrency] = useState(
    initialVolumeParsed?.currencyCode ?? 'EUR',
  )
  const [contractType, setContractType] = useState(
    () => formatContractTypeDisplay(initialData?.contract_type) || '',
  )
  const [incumbentProvider, setIncumbentProvider] = useState(
    initialData?.incumbent_provider ?? '',
  )
  const [competitors, setCompetitors] = useState(initialData?.competitors ?? '')
  const [customerChallenge, setCustomerChallenge] = useState(
    initialData?.customer_challenge ?? '',
  )
  const [ourSolution, setOurSolution] = useState(initialData?.our_solution ?? '')
  const [status, setStatus] = useState<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft',
  )
  const [ndaDeal, setNdaDeal] = useState(initialData?.is_nda_deal ?? false)
  const statusBeforeNdaRef = useRef<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _statusBeforeAnonymizedRef = useRef<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft',
  )
  const [contactId, setContactId] = useState(
    initialData?.contact_id ? initialData.contact_id : '__none__',
  )
  const [additionalContacts, setAdditionalContacts] = useState<ContactPerson[]>([])
  const [customer_contact_id, setCustomerContactId] = useState(
    initialData?.customer_contact_id ? initialData.customer_contact_id : '__none__',
  )
  const [additionalCustomerContacts, setAdditionalCustomerContacts] = useState<
    ExternalContactDisplay[]
  >([])
  const [editingInternalContact, setEditingInternalContact] =
    useState<ContactPerson | null>(null)
  const [editingCustomerContact, setEditingCustomerContact] =
    useState<ExternalContactDisplay | null>(null)

  // Auto-formatting only when editing an existing reference (one-time on mount).
  useEffect(() => {
    if (!initialData?.id) return
    if (didAutoFormatRef.current) return
    didAutoFormatRef.current = true

    setCustomerChallenge((prev) => normalizeWrappedParagraphs(prev))
    setOurSolution((prev) => normalizeWrappedParagraphs(prev))
  }, [initialData?.id])
  const [tags, setTags] = useState<string[]>(() => parseInitialTags(initialData?.tags))
  const [tagInputValue, setTagInputValue] = useState('')
  const [competitorInputValue, setCompetitorInputValue] = useState('')
  const [incumbentInputValue, setIncumbentInputValue] = useState('')
  const [incumbentSuggestions, setIncumbentSuggestions] = useState<string[]>([])
  const [competitorSuggestions, setCompetitorSuggestions] = useState<string[]>([])
  const [projectStatus, setProjectStatus] = useState(
    initialData?.project_status ?? '__none__',
  )
  const [projectStart, setProjectStart] = useState(initialData?.project_start ?? '')
  const [projectEnd, setProjectEnd] = useState(initialData?.project_end ?? '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_logoFile, _setLogoFile] = useState<File | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichedCompany, setEnrichedCompany] = useState<Company | null>(null)
  const [editCompanyName, setEditCompanyName] = useState(initialData?.company_name ?? '')
  const didAutoBrandfetchRef = useRef(false)
  const [magicImportLoading, setMagicImportLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const isEditMode = !!initialData

  useEffect(() => {
    if (!isEditMode || !initialData?.company_id || didAutoBrandfetchRef.current) return
    const needsBrandfetch =
      !String(initialData.industry ?? '').trim() ||
      !String(initialData.website ?? '').trim() ||
      !String(initialData.company_logo_url ?? '').trim()
    if (!needsBrandfetch) return

    didAutoBrandfetchRef.current = true
    void syncCompanyBrandfetchForEdit(initialData.company_id).then((result) => {
      if (!result.success) return
      const co = result.company
      setEditCompanyName(co.companyName)
      if (co.industry) setIndustry(resolveIndustryId(co.industry))
      if (co.website_url) setWebsite(co.website_url)
      if (co.headquarters) {
        setCountry(co.headquarters)
        setHeadquarters(co.headquarters)
      }
      if (co.employee_count != null) {
        setEmployeeCount(formatEmployeeCountDeDisplay(co.employee_count))
      }
      if (co.logo_url) setBrandfetchLogoUrl(co.logo_url)
    })
  }, [isEditMode, initialData])

  const displayCompanies =
    enrichedCompany && !companies.some((c) => c.id === enrichedCompany.id)
      ? [...companies, enrichedCompany]
      : companies

  const submitting = isEditMode ? editSubmitting : createSubmitting
  const contactsRaw = [...contacts, ...additionalContacts]
  const displayContacts = dedupeContacts(contactsRaw)
  const currentCompanyId = isEditMode ? initialData?.company_id : companyId
  // Nach ID deduplizieren: zuerst Server-Kontakte, dann neu angelegte (keine Dopplung in der Liste)
  const customerContactsRaw: ExternalContactDisplay[] = [
    ...externalContacts.filter((c) => c.company_id === currentCompanyId),
    ...additionalCustomerContacts,
  ]
  const displayCustomerContacts = dedupeCustomerContacts(customerContactsRaw)

  const applyBrandfetchPreview = useCallback(
    (query: string, opts?: { silent?: boolean }) => {
      const q = query.trim()
      if (q.length < 2) return
      setEnrichLoading(true)
      fetchCompanyEnrichment(q)
        .then((result) => {
          if (!result.success) {
            if (!opts?.silent) {
              toast.error(result.error)
            }
            return
          }
          setCompanyId('')
          setEnrichedCompany(null)
          setNewCompanyName(result.company_name)
          setWebsite(result.website_url ?? '')
          setIndustry(resolveIndustryId(result.industry ?? ''))
          setCountry(result.country ?? '')
          setHeadquarters(result.headquarters ?? '')
          setEmployeeCount(
            result.employee_count != null
              ? formatEmployeeCountDeDisplay(result.employee_count)
              : '',
          )
          setBrandfetchLogoUrl(result.logo_url ?? '')
          if (!opts?.silent) {
            toast.success('Markendaten geladen — bitte prüfen und Referenz speichern.')
          }
        })
        .finally(() => setEnrichLoading(false))
    },
    [],
  )

  const handleContactCreated = (contact: CreatedContact) => {
    const person: ContactPerson = {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
    }
    setAdditionalContacts((prev) => [...prev, person])
    setContactId(contact.id)
  }

  const handleCustomerContactCreated = (
    contact: ExternalContactDisplay | CreatedContact,
  ) => {
    const display: ExternalContactDisplay = {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      role: 'role' in contact && contact.role != null ? contact.role : undefined,
      phone: 'phone' in contact ? (contact.phone ?? undefined) : undefined,
    }
    setAdditionalCustomerContacts((prev) => [...prev, display])
    setCustomerContactId(contact.id)
  }

  function getSharedFieldState(): ReferenceFormSharedFieldState {
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

  async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = requiredSchema.safeParse({
      title,
      companyId,
      newCompanyName,
      summary,
      customerChallenge,
      ourSolution,
    })
    if (!parsed.success) {
      toast.error(formatZodError(parsed.error))
      return
    }
    if (projectStatus === 'completed' && !projectEnd.trim()) {
      toast.error('Bei abgeschlossenem Projekt ist das Projektende erforderlich.')
      return
    }
    setCreateSubmitting(true)
    try {
      const result = await createReference(
        buildFormDataCreate(getSharedFieldState(), companyId, newCompanyName),
      )
      if (result.success) {
        toast.success('Referenz wurde angelegt.')
        const refId =
          (result as unknown as { referenceId?: string; id?: string }).referenceId ??
          (result as { id?: string }).id
        if (refId && selectedFile) {
          void (async () => {
            const supabase = createClient()
            const { data: me } = await supabase.auth.getUser()
            if (!me?.user) return
            const { data: profile } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', me.user.id)
              .single()
            const orgId =
              (profile as { organization_id?: string | null } | null)?.organization_id ??
              null
            if (!orgId) return
            const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.\\-_]/g, '_')
            const storagePath = `${orgId}/${refId}/${Date.now()}-${safeName}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('references')
              .upload(storagePath, selectedFile)
            if (uploadError || !uploadData?.path) return
            const { data: publicUrlData } = supabase.storage
              .from('references')
              .getPublicUrl(uploadData.path)
            const originalUrl = publicUrlData?.publicUrl ?? null
            await attachOriginalDocumentToReference({
              referenceId: refId,
              file_path: uploadData.path,
              original_document_url: originalUrl,
              file_name: selectedFile.name,
              file_type: selectedFile.type || null,
            })
          })()
        }
        if (onSuccess) {
          onSuccess()
          router.refresh()
        } else {
          router.push(ROUTES.references.root)
          router.refresh()
        }
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      log.error('reference create failed', { action: 'createReference' }, err)
      toast.error(err instanceof Error ? err.message : 'Fehler beim Anlegen')
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!initialData?.id) return
    const parsed = editRequiredSchema.safeParse({
      title,
      editCompanyName,
      summary,
      customerChallenge,
      ourSolution,
    })
    if (!parsed.success) {
      toast.error(formatZodError(parsed.error))
      return
    }
    if (projectStatus === 'completed' && !projectEnd.trim()) {
      toast.error('Bei abgeschlossenem Projekt ist das Projektende erforderlich.')
      return
    }
    setEditSubmitting(true)
    try {
      await updateReference(
        initialData.id,
        buildFormDataEdit(getSharedFieldState(), editCompanyName),
      )
      toast.success('Referenz erfolgreich aktualisiert')
      if (onSuccess) {
        onSuccess()
        router.refresh()
      } else {
        router.push(ROUTES.references.root)
        router.refresh()
      }
    } catch (err) {
      log.error(
        'reference update failed',
        { action: 'updateReference', referenceId: initialData.id },
        err,
      )
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setEditSubmitting(false)
    }
  }

  const magicImportRequestIdRef = useRef(0)
  const lastMagicImportFileRef = useRef<File | null>(null)

  async function handleMagicImport(file: File) {
    const formData = new FormData()
    formData.set('file', file)
    lastMagicImportFileRef.current = file
    setMagicImportLoading(true)
    const requestId = ++magicImportRequestIdRef.current
    try {
      const timeoutMs = 120_000
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('EXTRACT_TIMEOUT')), timeoutMs),
      )
      const extractPromise = fetch('/api/reference-extract', {
        method: 'POST',
        body: formData,
      }).then(async (res) => {
        const json = (await res.json()) as ExtractDataFromDocumentResult
        if (!res.ok && !json.success) {
          return json
        }
        if (!res.ok) {
          return {
            success: false,
            error: 'Upload fehlgeschlagen. Bitte erneut versuchen.',
          } satisfies ExtractDataFromDocumentResult
        }
        return json
      })
      const result = await Promise.race([extractPromise, timeout])
      // Falls ein späteres Ergebnis eintrifft (z. B. Retry), ignorieren
      if (requestId !== magicImportRequestIdRef.current) return
      if (result.success) {
        const d = result.data
        if (d.title != null) setTitle(d.title)
        if (d.summary != null) setSummary(d.summary)
        if (d.industry != null) setIndustry(resolveIndustryId(d.industry))
        if (d.volume_eur != null) {
          const parsedVolume = parseReferenceVolume(d.volume_eur)
          if (parsedVolume) {
            setVolumeCurrency(parsedVolume.currencyCode)
            setVolumeEur(formatThousandsDots(parsedVolume.amountDigits))
          } else {
            setVolumeEur(formatThousandsDots(d.volume_eur))
          }
        }
        if (d.employee_count != null)
          setEmployeeCount(formatEmployeeCountDeDisplay(d.employee_count))
        if (Array.isArray(d.tags) && d.tags.length > 0) {
          setTags(d.tags)
          setTagInputValue('')
        }
        if (d.company_name != null) setNewCompanyName(d.company_name)
        if (d.customer_challenge != null) setCustomerChallenge(d.customer_challenge)
        if (d.our_solution != null) setOurSolution(d.our_solution)
        if (d.incumbent_provider?.trim())
          setIncumbentProvider(d.incumbent_provider.trim())
        if (d.competitors?.trim()) setCompetitors(d.competitors.trim())
        if (d.contract_type?.trim()) {
          const display =
            formatContractTypeDisplay(d.contract_type) || d.contract_type.trim()
          setContractType(display)
        }

        const addMonthsIso = (iso: string, months: number): string => {
          const dte = new Date(`${iso}T12:00:00Z`)
          dte.setUTCMonth(dte.getUTCMonth() + months)
          return dte.toISOString().slice(0, 10)
        }
        let start = d.project_start?.trim() || null
        let end = d.project_end?.trim() || null
        const months =
          typeof d.duration_months === 'number' && d.duration_months > 0
            ? Math.round(d.duration_months)
            : null
        if (months && start && !end) end = addMonthsIso(start, months)
        if (months && end && !start) start = addMonthsIso(end, -months)
        if (start) setProjectStart(start)
        if (end) setProjectEnd(end)
        if ((start || end) && (projectStatus === '__none__' || !projectStatus)) {
          setProjectStatus('completed')
        }

        toast.success(
          'Daten aus dem Dokument übernommen. Bitte prüfen und ggf. anpassen.',
        )
      } else {
        toast.error(
          result.error ||
            'Automatisches Ausfüllen fehlgeschlagen. Du kannst die Daten aber manuell eingeben.',
        )
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Extraktion fehlgeschlagen.'
      if (message === 'EXTRACT_TIMEOUT') {
        toast.error(
          'KI-Extraktion dauert länger als 2 Minuten. Bitte erneut versuchen oder Datei verkleinern.',
        )
        return
      }
      if (typeof message === 'string' && looksLikeProxyOrNetworkFailure(message)) {
        toast.error(
          'Die Datei konnte nicht verarbeitet werden (Proxy/Timeout). Bitte kleinere Datei verwenden (max. 4,5 MB) oder später erneut versuchen.',
        )
      } else {
        toast.error(
          message ||
            'Automatisches Ausfüllen fehlgeschlagen. Du kannst die Daten aber manuell eingeben.',
        )
      }
    } finally {
      setMagicImportLoading(false)
    }
  }

  const formId = 'refstack-main-form'

  const currentCompanyNameForAvatar = isEditMode
    ? editCompanyName
    : (companyId && displayCompanies.find((c) => c.id === companyId)?.name) ||
      newCompanyName

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
