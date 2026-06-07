'use client'

/* eslint-disable @next/next/no-img-element */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CirclePlus, Email, Loader, Phone, Sparkles } from '@hugeicons/core-free-icons'
import { z } from 'zod'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Command,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { attachOriginalDocumentToReference, createReference, fetchCompanyEnrichment } from './actions'
import type { ExtractDataFromDocumentResult } from './types'
import { createClient } from '@/lib/supabase/client'
import {
  updateReference,
  generateSummaryFromStory,
  getIncumbentSuggestions,
  getCompetitorSuggestions,
} from '../../actions'
import { REFERENCE_NARRATIVE_MAX_CHARS } from '@/lib/references/reference-narrative-limits'
import { syncCompanyBrandfetchForEdit } from '@/app/dashboard/references/sync-company-brandfetch'
import { CreateContactDialog, type CreatedContact } from './create-contact-dialog'
import type { ExternalContact } from './actions'
import {
  CompanyCombobox,
  FileDropZone,
  MagicImportDropzone,
  type ReferenceFormCompany,
} from './reference-form-fields'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import {
  formatEmployeeCountDeDisplay,
  parseGermanEmployeeCountInput,
  parseReferenceVolume,
} from '@/lib/format'
import {
  CONTRACT_TYPE_GROUPS,
  CONTRACT_TYPE_VALUES,
  formatContractTypeDisplay,
} from '@/lib/references/contract-type'

function normalizeWrappedParagraphs(input: string): string {
  const raw = input.replace(/\r\n/g, '\n').trim()
  if (!raw) return ''

  // Split into paragraphs by blank lines, then join single line breaks within a paragraph.
  const paragraphs = raw
    .split(/\n{2,}/g)
    .map((p) =>
      p
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(Boolean)

  return paragraphs.join('\n\n')
}

function formatThousandsDots(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Client-seitige Server-Action / Fetch-Fehler, die oft auf Proxy, Timeout oder Größenlimits hindeuten. */
function looksLikeProxyOrNetworkFailure(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('unexpected') ||
    m.includes('failed to fetch') ||
    m.includes('fetch failed') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('aborted') ||
    m.includes('econnreset') ||
    m.includes('socket hang up') ||
    m.includes('504') ||
    m.includes('502') ||
    m.includes('503') ||
    m.includes('413') ||
    (m.includes('body') && (m.includes('large') || m.includes('limit')))
  )
}

const INDUSTRIES = [
  'Finanzdienstleistungen & Versicherung',
  'Handel & Konsumgüter',
  'Industrie & Automotive',
  'Technologie, Medien & Telekommunikation',
  'Energie, Rohstoffe & Versorgung',
  'Gesundheitswesen & Life Sciences',
  'Öffentlicher Sektor & Bildung',
  'Beratung & Logistik',
  'Reise, Transport & Gastgewerbe',
  'Sonstige',
]

const COUNTRIES = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Frankreich',
  'Großbritannien',
  'USA',
  'Sonstige',
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'internal_only', label: 'Nur Intern' },
  { value: 'approved', label: 'Extern freigegeben' },
  { value: 'anonymized', label: 'Anonymisiert' },
] as const

const STATUS_HELP_TEXT: Record<ReferenceFormInitialData['status'], string> = {
  draft: 'Entwurf: In Arbeit, nur für den Ersteller sichtbar.',
  internal_only:
    'Nur Intern: Verifiziert, aber sensible Daten (Preise/Namen) dürfen das Haus nicht verlassen.',
  approved:
    'Extern freigegeben: Offiziell vom Kunden und Marketing freigegeben für Sales-Pitches.',
  anonymized:
    'Anonymisiert: Name und Logo entfernt (z. B. „Großbank“), bereit für öffentliche Case Studies.',
}

const PROJECT_STATUS_OPTIONS = [
  { value: '__none__', label: '— Keine Angabe' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
] as const

const VOLUME_CURRENCY_OPTIONS = [
  { code: 'AED', symbol: 'AED' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'CNY', symbol: '¥' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'JPY', symbol: '¥' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'USD', symbol: '$' },
] as const

type Company = ReferenceFormCompany

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

function normalizeContactIdentity(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .join('|')
}

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
  status: 'draft' | 'internal_only' | 'approved' | 'anonymized'
  file_path?: string | null
  tags?: string | null
  project_status?: 'active' | 'completed' | null
  project_start?: string | null
  project_end?: string | null
  is_nda_deal?: boolean
}

type BaseLabelProps = ComponentProps<typeof Label>

function RequiredLabel({
  className,
  children,
  ...props
}: BaseLabelProps & { children?: ReactNode }) {
  const base =
    'text-xs font-medium uppercase tracking-wider text-muted-foreground'
  return (
    <Label className={className ? `${base} ${className}` : base} {...props}>
      {children}
      <span className="ml-1 text-destructive">*</span>
    </Label>
  )
}

function OptionalLabel({
  className,
  children,
  ...props
}: BaseLabelProps & { children?: ReactNode }) {
  const base =
    'text-xs font-medium uppercase tracking-wider text-muted-foreground'
  return (
    <Label
      className={className ? `${base} ${className}` : base}
      {...props}
    >
      {children}
    </Label>
  )
}

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
  /** Externe Kontakte (Kundenansprechpartner), werden nach company_id gefiltert. */
  externalContacts?: ExternalContact[]
  initialData?: ReferenceFormInitialData
  /** Wenn gesetzt (z. B. bei Modal-Einbettung), wird nach erfolgreichem Anlegen/Bearbeiten aufgerufen statt zu navigieren. */
  onSuccess?: () => void
  /** Bei Modal-Einbettung: wird bei Abbrechen aufgerufen. */
  onClose?: () => void
  /** `dialog`: Fußzeile am unteren Dialogrand, Inhalt scrollt — `page`: bisheriges Sticky-Verhalten. */
  layout?: 'page' | 'dialog'
}) {
  const router = useRouter()
  const [editSubmitting, setEditSubmitting] = useState(false)
  const didAutoFormatRef = useRef(false)
  /** Beim Bearbeiten: sonst bleibt '' und Zod blockiert „Unternehmen“ zu Unrecht. */
  const [companyId, setCompanyId] = useState(initialData?.company_id ?? '')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [summary, setSummary] = useState(initialData?.summary ?? '')
  const [industry, setIndustry] = useState(initialData?.industry ?? '')
  const [country, setCountry] = useState(initialData?.country ?? '')
  const [headquarters, setHeadquarters] = useState('')
  const [brandfetchLogoUrl, setBrandfetchLogoUrl] = useState('')
  const [website, setWebsite] = useState(initialData?.website ?? '')
  const [employeeCount, setEmployeeCount] = useState(
    initialData?.employee_count != null
      ? formatEmployeeCountDeDisplay(initialData.employee_count)
      : ''
  )
  const initialVolumeParsed = parseReferenceVolume(initialData?.volume_eur ?? null)
  const [volumeEur, setVolumeEur] = useState(() => formatThousandsDots(initialVolumeParsed?.amountDigits ?? ''))
  const [volumeCurrency, setVolumeCurrency] = useState(initialVolumeParsed?.currencyCode ?? 'EUR')
  const [contractType, setContractType] = useState(
    () => formatContractTypeDisplay(initialData?.contract_type) || ''
  )
  const [incumbentProvider, setIncumbentProvider] = useState(
    initialData?.incumbent_provider ?? ''
  )
  const [competitors, setCompetitors] = useState(
    initialData?.competitors ?? ''
  )
  const [customerChallenge, setCustomerChallenge] = useState(
    initialData?.customer_challenge ?? ''
  )
  const [ourSolution, setOurSolution] = useState(
    initialData?.our_solution ?? ''
  )
  const [status, setStatus] = useState<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft'
  )
  const [ndaDeal, setNdaDeal] = useState(initialData?.is_nda_deal ?? false)
  const statusBeforeNdaRef = useRef<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft'
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _statusBeforeAnonymizedRef = useRef<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft'
  )
  const [contactId, setContactId] = useState(
    initialData?.contact_id ? initialData.contact_id : '__none__'
  )
  const [additionalContacts, setAdditionalContacts] = useState<ContactPerson[]>([])
  const [customer_contact_id, setCustomerContactId] = useState(
    initialData?.customer_contact_id ? initialData.customer_contact_id : '__none__'
  )
  const [additionalCustomerContacts, setAdditionalCustomerContacts] = useState<ExternalContactDisplay[]>([])
  const [editingInternalContact, setEditingInternalContact] = useState<ContactPerson | null>(null)
  const [editingCustomerContact, setEditingCustomerContact] = useState<ExternalContactDisplay | null>(null)

  // Auto-formatting only when editing an existing reference (one-time on mount).
  useEffect(() => {
    if (!initialData?.id) return
    if (didAutoFormatRef.current) return
    didAutoFormatRef.current = true

    setCustomerChallenge((prev) => normalizeWrappedParagraphs(prev))
    setOurSolution((prev) => normalizeWrappedParagraphs(prev))
  }, [initialData?.id])
  const normalizeTag = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (trimmed === trimmed.toUpperCase() && /[A-ZÄÖÜ]/.test(trimmed)) {
      return trimmed
    }
    const lower = trimmed.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  const [tags, setTags] = useState<string[]>(() => {
    if (!initialData?.tags) return []
    const seen = new Set<string>()
    const result: string[] = []
    initialData.tags
      .split(/[\s,;]+/)
      .map((s) => normalizeTag(s))
      .filter(Boolean)
      .forEach((t) => {
        if (!seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase())
          result.push(t)
        }
      })
    return result
  })
  const [tagInputValue, setTagInputValue] = useState('')
  const [competitorInputValue, setCompetitorInputValue] = useState('')
  const [incumbentInputValue, setIncumbentInputValue] = useState('')
  const [incumbentSuggestions, setIncumbentSuggestions] = useState<string[]>([])
  const [competitorSuggestions, setCompetitorSuggestions] = useState<string[]>([])
  const [projectStatus, setProjectStatus] = useState(
    initialData?.project_status ?? '__none__'
  )
  const [projectStart, setProjectStart] = useState(
    initialData?.project_start ?? ''
  )
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
      if (co.industry) setIndustry(co.industry)
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

  const displayCompanies = enrichedCompany && !companies.some((c) => c.id === enrichedCompany.id)
    ? [...companies, enrichedCompany]
    : companies

  const submitting = isEditMode ? editSubmitting : createSubmitting
  const contactsRaw = [...contacts, ...additionalContacts]
  const seenContactIds = new Set<string>()
  const seenContactIdentities = new Set<string>()
  const displayContacts = contactsRaw.filter((c) => {
    const identity = normalizeContactIdentity([c.first_name, c.last_name, c.email])
    if (identity !== '||' && seenContactIdentities.has(identity)) return false
    if (seenContactIds.has(c.id)) return false
    if (identity !== '||') seenContactIdentities.add(identity)
    seenContactIds.add(c.id)
    return true
  })
  const currentCompanyId = isEditMode ? initialData?.company_id : companyId
  // Nach ID deduplizieren: zuerst Server-Kontakte, dann neu angelegte (keine Dopplung in der Liste)
  const customerContactsRaw: ExternalContactDisplay[] = [
    ...externalContacts.filter((c) => c.company_id === currentCompanyId),
    ...additionalCustomerContacts,
  ]
  const seenCustomerIds = new Set<string>()
  const displayCustomerContacts = customerContactsRaw.filter((c) => {
    if (seenCustomerIds.has(c.id)) return false
    seenCustomerIds.add(c.id)
    return true
  })

  const applyBrandfetchPreview = useCallback((query: string, opts?: { silent?: boolean }) => {
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
        setIndustry(result.industry ?? '')
        setCountry(result.country ?? '')
        setHeadquarters(result.headquarters ?? '')
        setEmployeeCount(
          result.employee_count != null
            ? formatEmployeeCountDeDisplay(result.employee_count)
            : ''
        )
        setBrandfetchLogoUrl(result.logo_url ?? '')
        if (!opts?.silent) {
          toast.success('Markendaten geladen — bitte prüfen und Referenz speichern.')
        }
      })
      .finally(() => setEnrichLoading(false))
  }, [])

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

  const handleCustomerContactCreated = (contact: ExternalContact | CreatedContact) => {
    const display: ExternalContactDisplay = {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      role: 'role' in contact && contact.role != null ? contact.role : undefined,
      phone: 'phone' in contact ? contact.phone ?? undefined : undefined,
    }
    setAdditionalCustomerContacts((prev) => [...prev, display])
    setCustomerContactId(contact.id)
  }

  function formatZodError(error: z.ZodError): string {
    return (
      error.issues.map((i) => i.message).join(' · ') || 'Bitte Pflichtfelder ausfüllen.'
    )
  }

  /** Kein new FormData(DOM): doppelte name-Attribute lieferten teils den falschen ersten Wert. */
  function appendSharedReferenceFields(fd: FormData) {
    fd.set('title', title.trim())
    fd.set('summary', summary.trim())
    fd.set('industry', industry)
    fd.set('country', country)
    const ec = parseGermanEmployeeCountInput(employeeCount)
    fd.set('employee_count', ec != null ? String(ec) : '')
    fd.set('website', website.trim())
    fd.set('company_headquarters', headquarters.trim())
    fd.set('company_logo_url', brandfetchLogoUrl.trim())
    fd.set('customer_challenge', customerChallenge)
    fd.set('our_solution', ourSolution)
    fd.set('contactId', contactId === '__none__' ? '' : contactId)
    fd.set('customer_contact_id', customer_contact_id === '__none__' ? '' : customer_contact_id)
    const selectedCustomer = displayCustomerContacts.find((c) => c.id === customer_contact_id)
    const customerDisplay = selectedCustomer
      ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') +
        (selectedCustomer.role ? `, ${selectedCustomer.role}` : '')
      : ''
    fd.set('customer_contact', customerDisplay)
    fd.set('project_status', projectStatus === '__none__' ? '' : projectStatus)
    fd.set('project_start', projectStart)
    fd.set('project_end', projectStatus === 'active' ? '' : projectEnd)
    if (volumeEur) {
      fd.set('volume_eur', `${volumeCurrency} ${volumeEur.replace(/\./g, '')}`)
    }
    fd.set('contract_type', contractType)
    fd.set('incumbent_provider', incumbentProvider)
    fd.set('competitors', competitors)
    fd.set('status', status)
    fd.set('nda_deal', ndaDeal ? '1' : '0')
    fd.set('tags', tags.join(','))
  }

  function buildFormDataCreate(): FormData {
    const fd = new FormData()
    appendSharedReferenceFields(fd)
    fd.set('companyId', companyId)
    fd.set('newCompanyName', newCompanyName.trim())
    return fd
  }

  function buildFormDataEdit(): FormData {
    const fd = new FormData()
    appendSharedReferenceFields(fd)
    fd.set('company_name', editCompanyName.trim())
    return fd
  }

  const narrativeMaxMsg = (label: string) =>
    `${label}: höchstens ${REFERENCE_NARRATIVE_MAX_CHARS} Zeichen.`

  const requiredSchema = z
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

  const editRequiredSchema = z.object({
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
      const result = await createReference(buildFormDataCreate())
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
            const orgId = (profile as { organization_id?: string | null } | null)?.organization_id ?? null
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
            })
          })()
        }
        if (onSuccess) {
          onSuccess()
          router.refresh()
        } else {
          router.push(ROUTES.evidence.root)
          router.refresh()
        }
      } else {
        toast.error(result.error)
      }
    } catch (err) {
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
      await updateReference(initialData.id, buildFormDataEdit())
      toast.success('Referenz erfolgreich aktualisiert')
      if (onSuccess) {
        onSuccess()
        router.refresh()
      } else {
        router.push(ROUTES.evidence.root)
        router.refresh()
      }
    } catch (err) {
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
        setTimeout(() => reject(new Error('EXTRACT_TIMEOUT')), timeoutMs)
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
        if (d.industry != null) setIndustry(d.industry)
        if (d.volume_eur != null) {
          const parsedVolume = parseReferenceVolume(d.volume_eur)
          if (parsedVolume) {
            setVolumeCurrency(parsedVolume.currencyCode)
            setVolumeEur(formatThousandsDots(parsedVolume.amountDigits))
          } else {
            setVolumeEur(formatThousandsDots(d.volume_eur))
          }
        }
        if (d.employee_count != null) setEmployeeCount(formatEmployeeCountDeDisplay(d.employee_count))
        if (Array.isArray(d.tags) && d.tags.length > 0) {
          setTags(d.tags)
          setTagInputValue('')
        }
        if (d.company_name != null) setNewCompanyName(d.company_name)
        if (d.customer_challenge != null) setCustomerChallenge(d.customer_challenge)
        if (d.our_solution != null) setOurSolution(d.our_solution)
        toast.success('Daten aus dem Dokument übernommen. Bitte prüfen und ggf. anpassen.')
      } else {
        toast.error(
          result.error ||
            'Automatisches Ausfüllen fehlgeschlagen. Du kannst die Daten aber manuell eingeben.'
        )
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Extraktion fehlgeschlagen.'
      if (message === 'EXTRACT_TIMEOUT') {
        toast.error('KI-Extraktion dauert länger als 2 Minuten. Bitte erneut versuchen oder Datei verkleinern.')
        return
      }
      if (typeof message === 'string' && looksLikeProxyOrNetworkFailure(message)) {
        toast.error(
          'Die Datei konnte nicht verarbeitet werden (Proxy/Timeout). Bitte kleinere Datei verwenden (max. 4,5 MB) oder später erneut versuchen.'
        )
      } else {
        toast.error(
          message ||
            'Automatisches Ausfüllen fehlgeschlagen. Du kannst die Daten aber manuell eingeben.'
        )
      }
    } finally {
      setMagicImportLoading(false)
    }
  }

  const formId = 'refstack-main-form'

  const currentCompanyNameForAvatar = isEditMode
    ? editCompanyName
    : ((companyId &&
        displayCompanies.find((c) => c.id === companyId)?.name) ||
      newCompanyName)

  function renderFormContent() {
    const volumeBlock = (
      <div className="space-y-2">
        <OptionalLabel htmlFor="volume_eur">Volumen</OptionalLabel>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <Input
            id="volume_eur"
            name="volume_eur"
            type="text"
            inputMode="numeric"
            placeholder="z. B. 5.000.000"
            disabled={submitting}
            className="min-w-0 flex-1 sm:max-w-none"
            value={volumeEur}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              if (!digits) {
                setVolumeEur('')
                return
              }
              const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
              setVolumeEur(withSeparators)
            }}
          />
          <Select value={volumeCurrency} onValueChange={setVolumeCurrency} disabled={submitting}>
            <SelectTrigger
              className="h-10 w-[104px] shrink-0 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
              aria-label="Währung wählen"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOLUME_CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  {opt.symbol} ({opt.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )

    const contractBlock = (
      <div className="space-y-2">
        <OptionalLabel htmlFor="contract_type">Vertragsart</OptionalLabel>
        <input type="hidden" name="contract_type" value={contractType} />
        <Select value={contractType || undefined} onValueChange={setContractType} disabled={submitting}>
          <SelectTrigger id="contract_type" className="w-full">
            <SelectValue placeholder="Auswählen …" />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPE_GROUPS.map((group, groupIndex) => (
              <div key={group.label}>
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {groupIndex < CONTRACT_TYPE_GROUPS.length - 1 ? <SelectSeparator /> : null}
              </div>
            ))}
            {contractType && !CONTRACT_TYPE_VALUES.includes(contractType) ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Bestehender Wert</SelectLabel>
                  <SelectItem value={contractType}>
                    {formatContractTypeDisplay(contractType)}
                  </SelectItem>
                </SelectGroup>
              </>
            ) : null}
          </SelectContent>
        </Select>
      </div>
    )

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            {!isEditMode && (
              <div className="space-y-4">
                <MagicImportDropzone
                  onFileAccept={handleMagicImport}
                  loading={magicImportLoading}
                  disabled={submitting}
                />
                <Separator className="mt-2" />
              </div>
            )}
            {/* Unternehmen */}
            <div className="grid grid-cols-1 gap-4 items-start">
              <div className="space-y-2">
                <RequiredLabel htmlFor={isEditMode ? 'company_name' : 'companyId'}>
                  Unternehmen
                </RequiredLabel>
                {isEditMode ? (
                  <div className="relative">
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="z. B. BMW oder bmw.de für Auto-Fill"
                      required
                      disabled={submitting}
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                    />
                    {enrichLoading && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <AppIcon icon={Loader} size={16} className="animate-spin" />
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <CompanyCombobox
                        companies={displayCompanies}
                        value={currentCompanyNameForAvatar}
                        onValueChange={(val) => {
                          setNewCompanyName(val)
                          setCompanyId('')
                        }}
                        onConfirmValue={(val) => {
                          setNewCompanyName(val)
                          setCompanyId('')
                          applyBrandfetchPreview(val)
                        }}
                        onAutoRemotePreview={(q) => applyBrandfetchPreview(q, { silent: true })}
                        previewLoading={enrichLoading}
                        onSelectCompany={(company) => {
                          if (company.id.startsWith('brandfetch:')) {
                            setCompanyId('')
                            setNewCompanyName(company.name)
                            applyBrandfetchPreview(company.name, { silent: true })
                            return
                          }
                          setCompanyId(company.id)
                          setNewCompanyName(company.name)
                          setEnrichedCompany(null)
                          setBrandfetchLogoUrl('')
                        }}
                        loading={enrichLoading}
                        disabled={submitting}
                        companyId={companyId}
                      />
                    </div>
                    <input type="hidden" name="companyId" value={companyId} />
                    <input type="hidden" name="newCompanyName" value={newCompanyName} />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="title">Titel</RequiredLabel>
              <Input
                id="title"
                name="title"
                placeholder="z. B. Cloud Transformation 2024"
                required
                disabled={submitting}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <OptionalLabel>Industrie</OptionalLabel>
                <input type="hidden" name="industry" value={industry} />
                <Select
                  value={industry || undefined}
                  onValueChange={setIndustry}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auswählen …" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <OptionalLabel>HQ</OptionalLabel>
                <input type="hidden" name="country" value={country} />
                <Select
                  value={country || undefined}
                  onValueChange={setCountry}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auswählen …" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <OptionalLabel htmlFor="employee_count">Mitarbeiter</OptionalLabel>
                <Input
                  id="employee_count"
                  name="employee_count"
                  type="text"
                  inputMode="numeric"
                  placeholder="z. B. 12000"
                  disabled={submitting}
                  value={employeeCount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setEmployeeCount(digits ? formatThousandsDots(digits) : '')
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <OptionalLabel htmlFor="website">Website</OptionalLabel>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="z. B. https://example.com"
                  disabled={submitting}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <OptionalLabel htmlFor="summary">Zusammenfassung</OptionalLabel>
              <div className="relative">
                <Textarea
                  id="summary"
                  name="summary"
                  placeholder="Kurze Beschreibung der Referenz …"
                  rows={4}
                  disabled={submitting}
                  value={summary}
                  maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
                  onChange={(e) => setSummary(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:bg-muted"
                  disabled={submitting || summaryLoading}
                  onClick={async () => {
                    setSummaryLoading(true)
                    try {
                      const result = await generateSummaryFromStory(
                        customerChallenge,
                        ourSolution,
                        initialData?.id
                      )
                      if (result.success) {
                        setSummary(result.summary)
                        toast.success('KI-Zusammenfassung übernommen.')
                      } else {
                        toast.error(result.error)
                      }
                    } finally {
                      setSummaryLoading(false)
                    }
                  }}
                  aria-label="KI-Vorschlag für Zusammenfassung"
                >
                  {summaryLoading ? (
                    <AppIcon icon={Loader} size={14} className="animate-spin" />
                  ) : (
                    <AppIcon icon={Sparkles} size={14} />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-right tabular-nums">
                {summary.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
              </p>
            </div>

            {/* Storytelling: Herausforderung & Lösung */}
            <div className="space-y-3">
              <div className="space-y-1">
                <RequiredLabel htmlFor="customer_challenge">
                  Herausforderung des Kunden
                </RequiredLabel>
                <Textarea
                  id="customer_challenge"
                  name="customer_challenge"
                  placeholder="Welche Herausforderung oder welches Ziel hatte der Kunde?"
                  rows={4}
                  disabled={submitting}
                  value={customerChallenge}
                  maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
                  onChange={(e) => setCustomerChallenge(e.target.value)}
                  className="text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">
                  {customerChallenge.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
                </p>
              </div>
              <div className="space-y-1">
                <RequiredLabel htmlFor="our_solution">Unsere Lösung</RequiredLabel>
                <Textarea
                  id="our_solution"
                  name="our_solution"
                  placeholder="Wie haben wir die Herausforderung gelöst?"
                  rows={4}
                  disabled={submitting}
                  value={ourSolution}
                  maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
                  onChange={(e) => setOurSolution(e.target.value)}
                  className="text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">
                  {ourSolution.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <OptionalLabel htmlFor="tags-input">Tags</OptionalLabel>
              <input type="hidden" name="tags" value={tags.join(' ')} />
              <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="rounded-full hover:bg-muted-foreground/20 -mr-0.5 p-0.5"
                      aria-label={`Tag „${tag}" entfernen`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="tags-input"
                  type="text"
                  placeholder={
                    tags.length === 0
                      ? 'z. B. Cloud — Enter drücken, um einen Tag zu übernehmen'
                      : 'Weiterer Tag… (Enter)'
                  }
                  disabled={submitting}
                  value={tagInputValue}
                  onChange={(e) => setTagInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = normalizeTag(tagInputValue)
                      if (value) {
                        setTags((prev) => {
                          const exists = prev.some(
                            (t) => t.toLowerCase() === value.toLowerCase()
                          )
                          return exists ? prev : [...prev, value]
                        })
                        setTagInputValue('')
                      }
                    }
                  }}
                  className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <RequiredLabel htmlFor="contactId">Ansprechpartner intern</RequiredLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="hidden"
                name="contactId"
                value={contactId === '__none__' ? '' : contactId}
              />
              <Select
                value={contactId || '__none__'}
                onValueChange={(v) => setContactId(v ?? '__none__')}
                disabled={submitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Person auswählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine</SelectItem>
                  {displayContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="truncate">
                            {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                              c.email ||
                              c.id}
                            {c.email ? ` (${c.email})` : ''}
                          </span>
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingInternalContact(c)
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
                <CreateContactDialog onContactCreated={handleContactCreated} />
          </div>
          {contactId && contactId !== '__none__' && (() => {
            const c = displayContacts.find((x) => x.id === contactId)
            return c?.email ? (
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[10px]">
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline">
                  <AppIcon icon={Email} size={14} />
                  {c.email}
                </a>
              </div>
            ) : null
          })()}
          <p className="text-muted-foreground text-[10px] italic">
            Wird für Freigabe-Anfragen per E-Mail benachrichtigt.
          </p>
        </div>

        <div className="space-y-2">
          <OptionalLabel htmlFor="customer_contact_id">Kundenansprechpartner</OptionalLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="hidden"
                name="customer_contact_id"
                value={customer_contact_id === '__none__' ? '' : customer_contact_id}
              />
              <Select
                value={customer_contact_id || '__none__'}
                onValueChange={(v) => setCustomerContactId(v ?? '__none__')}
                disabled={submitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Person auswählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine</SelectItem>
                  {displayCustomerContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="truncate">
                            {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                              c.email ||
                              c.id}
                            {c.email ? ` (${c.email})` : ''}
                          </span>
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingCustomerContact(c)
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CreateContactDialog
              variant="external"
              companyId={currentCompanyId || undefined}
              onContactCreated={handleCustomerContactCreated}
              disabled={!currentCompanyId}
            />
          </div>
          {customer_contact_id && customer_contact_id !== '__none__' && (() => {
            const c = displayCustomerContacts.find((x) => x.id === customer_contact_id)
            return (c?.email || c?.phone) ? (
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[10px]">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline">
                    <AppIcon icon={Email} size={14} />
                    {c.email}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:underline">
                    <AppIcon icon={Phone} size={14} />
                    {c.phone}
                  </a>
                )}
              </div>
            ) : null
          })()}
          {!currentCompanyId && (
            <p className="text-muted-foreground text-[10px] italic">
              {newCompanyName.trim()
                ? 'Kundenkontakt: Nach dem Speichern der Referenz ergänzen (neues Unternehmen wird mit angelegt).'
                : 'Feld wird aktiviert, sobald oben ein Unternehmen ausgewählt wurde.'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
          <RequiredLabel htmlFor="project_status">Projektstatus</RequiredLabel>
        <input
          type="hidden"
          name="project_status"
          value={projectStatus === '__none__' ? '' : projectStatus}
        />
        <Select
          value={projectStatus || '__none__'}
          onValueChange={(val) => {
            setProjectStatus(val)
            if (val === 'active') setProjectEnd('')
          }}
          disabled={submitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auswählen …" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {editingInternalContact && (
        <CreateContactDialog
          mode="edit"
          variant="internal"
          onContactCreated={(updated) => {
            const u = updated as ContactPerson
            setAdditionalContacts((prev) =>
              prev.some((p) => p.id === u.id)
                ? prev.map((p) => (p.id === u.id ? u : p))
                : [...prev, u]
            )
            setEditingInternalContact(null)
          }}
          disabled={submitting}
          initialContact={editingInternalContact}
        />
      )}
      {editingCustomerContact && (
        <CreateContactDialog
          mode="edit"
          variant="external"
          companyId={currentCompanyId || undefined}
          onContactCreated={(updated) => {
            const u = updated as ExternalContactDisplay
            setAdditionalCustomerContacts((prev) =>
              prev.some((p) => p.id === u.id)
                ? prev.map((p) => (p.id === u.id ? u : p))
                : [...prev, u]
            )
            setEditingCustomerContact(null)
          }}
          disabled={submitting}
          initialContact={editingCustomerContact}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <RequiredLabel htmlFor="project_start">Projektstart</RequiredLabel>
          <Input
            id="project_start"
            name="project_start"
            type="date"
            disabled={submitting}
            value={projectStart}
            onChange={(e) => setProjectStart(e.target.value)}
          />
        </div>
        {projectStatus === 'active' ? (
          volumeBlock
        ) : (
          <div className="space-y-2">
            {projectStatus === 'completed' ? (
              <RequiredLabel htmlFor="project_end">Projektende</RequiredLabel>
            ) : (
              <OptionalLabel htmlFor="project_end">Projektende</OptionalLabel>
            )}
            <Input
              id="project_end"
              name="project_end"
              type="date"
              disabled={submitting}
              value={projectEnd}
              onChange={(e) => setProjectEnd(e.target.value)}
              required={projectStatus === 'completed'}
            />
            {projectStatus === 'completed' ? (
              <p className="text-muted-foreground text-[10px] italic">
                Erforderlich bei abgeschlossenem Projekt.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {projectStatus === 'active' ? (
        <div className="space-y-2">{contractBlock}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {volumeBlock}
          {contractBlock}
        </div>
      )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <OptionalLabel htmlFor="incumbent_provider">
            Aktueller Dienstleister (Incumbent)
          </OptionalLabel>
          <input type="hidden" name="incumbent_provider" value={incumbentProvider} />
          <div className="relative">
            <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
              {incumbentProvider
                .split(/[;,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {name}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setIncumbentProvider(
                          incumbentProvider
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                            .filter((n) => n && n.toLowerCase() !== name.toLowerCase())
                            .join(', ')
                        )
                      }}
                      className="rounded-full px-1 hover:bg-accent"
                      aria-label={`Incumbent „${name}" entfernen`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              <input
                id="incumbent_provider"
                placeholder={
                  incumbentProvider.trim()
                    ? 'Weiteren Dienstleister hinzufügen…'
                    : 'z. B. bisheriger Anbieter'
                }
                disabled={submitting}
                value={incumbentInputValue}
                onChange={async (e) => {
                  const value = e.target.value
                  setIncumbentInputValue(value)
                  if (!value.trim()) {
                    setIncumbentSuggestions([])
                    return
                  }
                  try {
                    const list = await getIncumbentSuggestions(value)
                    setIncumbentSuggestions(list)
                  } catch {
                    setIncumbentSuggestions([])
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ',' || e.key === 'Enter') {
                    e.preventDefault()
                    const raw = incumbentInputValue.trim()
                    if (!raw) return
                    const parts = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
                    const existing = incumbentProvider
                      .split(/[;,]+/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                    const merged = [...existing]
                    parts.forEach((p) => {
                      if (!merged.some((n) => n.toLowerCase() === p.toLowerCase())) {
                        merged.push(p)
                      }
                    })
                    setIncumbentProvider(merged.join(', '))
                    setIncumbentInputValue('')
                    setIncumbentSuggestions([])
                  }
                }}
                className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {incumbentSuggestions.length > 0 && incumbentInputValue.trim() && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                <Command>
                  <CommandList>
                    {incumbentSuggestions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={(val) => {
                          const existing = incumbentProvider
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                            .filter(Boolean)
                          if (!existing.some((n) => n.toLowerCase() === val.toLowerCase())) {
                            setIncumbentProvider([...existing, val].join(', '))
                          }
                          setIncumbentInputValue('')
                          setIncumbentSuggestions([])
                        }}
                      >
                        {name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <OptionalLabel htmlFor="competitors">
            Weitere beteiligte Wettbewerber
          </OptionalLabel>
          <div className="relative">
            <input type="hidden" name="competitors" value={competitors} />
            <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
              {competitors
                .split(/[;,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {name}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setCompetitors(
                          competitors
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                            .filter((n) => n && n !== name)
                            .join(', ')
                        )
                      }}
                      className="rounded-full px-1 hover:bg-accent"
                      aria-label={`Wettbewerber „${name}" entfernen`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  id="competitors"
                  placeholder={
                    competitors.trim()
                      ? 'Weiteren Wettbewerber hinzufügen…'
                      : 'z. B. Accenture, Deloitte'
                  }
                  disabled={submitting}
                  value={competitorInputValue}
                  onChange={async (e) => {
                    const value = e.target.value
                    setCompetitorInputValue(value)
                    if (!value.trim()) {
                      setCompetitorSuggestions([])
                      return
                    }
                    try {
                      const list = await getCompetitorSuggestions(value)
                      setCompetitorSuggestions(list)
                    } catch {
                      setCompetitorSuggestions([])
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ',' || e.key === 'Enter') {
                      e.preventDefault()
                      const raw = competitorInputValue.trim()
                      if (!raw) return
                      const parts = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
                      const existing = competitors
                        .split(/[;,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      const merged = [...existing]
                      parts.forEach((p) => {
                        if (!merged.some((n) => n.toLowerCase() === p.toLowerCase())) {
                          merged.push(p)
                        }
                      })
                      setCompetitors(merged.join(', '))
                      setCompetitorInputValue('')
                      setCompetitorSuggestions([])
                    }
                  }}
                  className="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {competitorSuggestions.length > 0 && competitorInputValue.trim() && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                    <Command>
                      <CommandList>
                        {competitorSuggestions.map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={(val) => {
                              const existing = competitors
                                .split(/[;,]+/)
                                .map((s) => s.trim())
                                .filter(Boolean)
                              if (!existing.some((n) => n.toLowerCase() === val.toLowerCase())) {
                                setCompetitors([...existing, val].join(', '))
                              }
                              setCompetitorInputValue('')
                              setCompetitorSuggestions([])
                            }}
                          >
                            {name}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <OptionalLabel>PDF Anhang</OptionalLabel>
        <FileDropZone
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          disabled={submitting}
          existingFilePath={initialData?.file_path}
        />
      </div>

      {/* Status + NDA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <RequiredLabel htmlFor="status">Status / Freigabestufe</RequiredLabel>
          <input type="hidden" name="status" value={status} />
          <Select
            value={status}
            onValueChange={(val) => {
              const next = val as ReferenceFormInitialData['status']
              setStatus(next)
              if (ndaDeal && next !== 'internal_only') {
                // Falls Status manuell geändert wird, lösen wir NDA-Modus wieder auf
                setNdaDeal(false)
                statusBeforeNdaRef.current = next
              }
            }}
            disabled={submitting || ndaDeal}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[10px] italic">
            {ndaDeal
              ? 'NDA Deal aktiv: Status wird automatisch auf „Intern“ gesetzt.'
              : STATUS_HELP_TEXT[status]}
          </p>
        </div>

        <div className="space-y-1">
          <OptionalLabel htmlFor="nda_deal">Ist dies ein NDA Deal?</OptionalLabel>
          <Switch
            id="nda_deal"
            checked={ndaDeal}
            disabled={submitting}
            onCheckedChange={(checked) => {
              setNdaDeal(checked)
              if (checked) {
                statusBeforeNdaRef.current = status
                setStatus('internal_only')
              } else {
                setStatus(statusBeforeNdaRef.current ?? 'draft')
              }
            }}
          />
        </div>
      </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          disabled={submitting}
          onClick={() => (onClose ? onClose() : router.push(ROUTES.home))}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
        >
          <AppIcon icon={CirclePlus} size={16} className="mr-2" />
          Speichern
        </Button>
      </div>
    </div>
  )

  const formInnerClass = 'w-full min-w-0 space-y-6 pb-2'

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
            {isEditMode ? (
              <form id={formId} noValidate onSubmit={handleEditSubmit} className={formInnerClass}>
                {renderFormContent()}
              </form>
            ) : (
              <form id={formId} noValidate onSubmit={handleCreateSubmit} className={formInnerClass}>
                {renderFormContent()}
              </form>
            )}
          </div>
          {actionBar}
        </>
      ) : (
        <>
          {isEditMode ? (
            <form id={formId} noValidate onSubmit={handleEditSubmit} className={formInnerClass}>
              {renderFormContent()}
            </form>
          ) : (
            <form id={formId} noValidate onSubmit={handleCreateSubmit} className={formInnerClass}>
              {renderFormContent()}
            </form>
          )}
          {actionBar}
        </>
      )}
    </div>
  )
}
