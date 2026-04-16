'use client'

/* eslint-disable @next/next/no-img-element */

import {
  useState,
  useRef,
  useEffect,
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { attachOriginalDocumentToReference, createReference, enrichAndSaveCompany, fetchCompanyEnrichment } from './actions'
import { createClient } from '@/lib/supabase/client'
import {
  updateReference,
  generateSummaryFromStory,
  getIncumbentSuggestions,
  getCompetitorSuggestions,
} from '../../actions'
import { extractDataFromDocument } from '@/lib/document-extraction'
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

const CONTRACT_TYPE_OPTIONS = [
  'Time & Material',
  'Festpreis (Fixed Price)',
  'Rahmenvertrag',
  'Projektvertrag',
  'Wartungsvertrag',
  'SaaS / Subscription',
  'Sonstige',
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

function RequiredLabel({ className, ...props }: BaseLabelProps) {
  const base =
    'text-xs font-medium uppercase tracking-wider text-muted-foreground'
  return <Label className={className ? `${base} ${className}` : base} {...props} />
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
      <span className="ml-1 text-[10px] font-normal normal-case text-muted-foreground">
        (optional)
      </span>
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_headquarters, setHeadquarters] = useState('')
  const [website, setWebsite] = useState(initialData?.website ?? '')
  const [employeeCount, setEmployeeCount] = useState(
    initialData?.employee_count != null ? `${initialData.employee_count}` : ''
  )
  const [volumeEur, setVolumeEur] = useState(initialData?.volume_eur ?? '')
  const [contractType, setContractType] = useState(
    initialData?.contract_type ?? ''
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
  const [enrichedLogoUrl, setEnrichedLogoUrl] = useState<string | null>(initialData?.company_logo_url ?? null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichedCompany, setEnrichedCompany] = useState<Company | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _enrichDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editCompanyName, setEditCompanyName] = useState(initialData?.company_name ?? '')
  const editEnrichDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [magicImportLoading, setMagicImportLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const isEditMode = !!initialData
  const displayCompanies = enrichedCompany && !companies.some((c) => c.id === enrichedCompany.id)
    ? [...companies, enrichedCompany]
    : companies

  /** Brandfetch wird nur nach Auswahl im Dropdown aufgerufen, nicht beim Tippen. */
  useEffect(() => {
    if (!isEditMode) return
    const trimmed = editCompanyName.trim()
    if (trimmed.length < 2) return
    if (editEnrichDebounceRef.current) clearTimeout(editEnrichDebounceRef.current)
    const nameToFetch = editCompanyName.trim()
    editEnrichDebounceRef.current = setTimeout(() => {
      editEnrichDebounceRef.current = null
      setEnrichLoading(true)
      fetchCompanyEnrichment(nameToFetch)
        .then((result) => {
          if (result.success) {
            setEditCompanyName(result.company_name)
            setWebsite(result.website_url ?? '')
            setIndustry(result.industry ?? '')
            setCountry(result.country ?? '')
            setHeadquarters(result.headquarters ?? '')
            setEmployeeCount(result.employee_count != null ? String(result.employee_count) : '')
            setEnrichedLogoUrl(result.logo_url ?? null)
            toast.success('Unternehmensdaten wurden geladen.')
          } else {
            toast.error(result.error)
          }
        })
        .finally(() => setEnrichLoading(false))
    }, 2000)
    return () => {
      if (editEnrichDebounceRef.current) clearTimeout(editEnrichDebounceRef.current)
    }
  }, [isEditMode, editCompanyName])

  const submitting = isEditMode ? editSubmitting : createSubmitting
  const isAnonymized = status === 'anonymized'
  const contactsRaw = [...contacts, ...additionalContacts]
  const seenContactIds = new Set<string>()
  const displayContacts = contactsRaw.filter((c) => {
    if (seenContactIds.has(c.id)) return false
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
    fd.set('employee_count', employeeCount)
    fd.set('website', website.trim())
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
      fd.set('volume_eur', volumeEur.replace(/\./g, ''))
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

  const requiredSchema = z
    .object({
      title: z.string().trim().min(1, 'Titel ist ein Pflichtfeld.'),
      companyId: z.string().optional(),
      newCompanyName: z.string().optional(),
      customerChallenge: z.string().trim().min(1, 'Herausforderung ist ein Pflichtfeld.'),
      ourSolution: z.string().trim().min(1, 'Lösung ist ein Pflichtfeld.'),
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
    customerChallenge: z.string().trim().min(1, 'Herausforderung ist ein Pflichtfeld.'),
    ourSolution: z.string().trim().min(1, 'Lösung ist ein Pflichtfeld.'),
  })

  async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = requiredSchema.safeParse({
      title,
      companyId,
      newCompanyName,
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
      const timeoutMs = 10_000
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('EXTRACT_TIMEOUT')), timeoutMs)
      )
      const result = await Promise.race([extractDataFromDocument(formData), timeout])
      // Falls ein späteres Ergebnis eintrifft (z. B. Retry), ignorieren
      if (requestId !== magicImportRequestIdRef.current) return
      if (result.success) {
        const d = result.data
        if (d.title != null) setTitle(d.title)
        if (d.summary != null) setSummary(d.summary)
        if (d.industry != null) setIndustry(d.industry)
        if (d.volume_eur != null) setVolumeEur(d.volume_eur)
        if (d.employee_count != null) setEmployeeCount(String(d.employee_count))
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
        toast.error('KI-Extraktion dauert länger als 10 Sekunden. Bitte erneut versuchen.')
        return
      }
      // Vercel / Next.js gibt bei Proxy-/Timeout-Fehlern oft nur "Unexpected Server Response" zurück
      if (typeof message === 'string' && message.toLowerCase().includes('unexpected')) {
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

  const mainCompanyLogoUrl =
    isAnonymized ? null : enrichedLogoUrl ?? initialData?.company_logo_url ?? null

  const currentCompanyNameForAvatar = isEditMode
    ? editCompanyName
    : ((companyId &&
        displayCompanies.find((c) => c.id === companyId)?.name) ||
      newCompanyName)

  function renderFormContent() {
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
            {/* Unternehmen + Logo */}
            <div className="grid grid-cols-1 gap-4 items-start">
              <div className="space-y-2">
                <RequiredLabel htmlFor={isEditMode ? 'company_name' : 'companyId'}>
                  Unternehmen
                </RequiredLabel>
                {isEditMode ? (
                  <div className="relative">
                    {!isAnonymized && (mainCompanyLogoUrl || editCompanyName.trim()) && (
                      <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {mainCompanyLogoUrl ? (
                          <img
                            src={mainCompanyLogoUrl}
                            alt=""
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            {editCompanyName.trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                    )}
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="z. B. BMW oder bmw.de für Auto-Fill"
                      required
                      disabled={submitting}
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className={
                        !isAnonymized && (mainCompanyLogoUrl || editCompanyName.trim())
                          ? 'pl-12'
                          : undefined
                      }
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
                      {!isAnonymized &&
                        (mainCompanyLogoUrl || currentCompanyNameForAvatar.trim()) && (
                          <span className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-muted">
                            {mainCompanyLogoUrl ? (
                              <img
                                src={mainCompanyLogoUrl}
                                alt=""
                                className="h-8 w-8 object-contain"
                              />
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground">
                                {currentCompanyNameForAvatar.trim().charAt(0).toUpperCase()}
                              </span>
                            )}
                          </span>
                        )}
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
                          setEnrichLoading(true)
                          enrichAndSaveCompany(val)
                            .then((result) => {
                              if (result.success) {
                                setCompanyId(result.company_id)
                                setEnrichedCompany({
                                  id: result.company_id,
                                  name: result.company_name,
                                  logo_url: result.logo_url ?? null,
                                })
                                setWebsite(result.website_url ?? '')
                                setIndustry(result.industry ?? '')
                                setCountry(result.country ?? '')
                                setHeadquarters(result.headquarters ?? '')
                                setEmployeeCount(
                                  result.employee_count != null
                                    ? String(result.employee_count)
                                    : ''
                                )
                                setEnrichedLogoUrl(result.logo_url ?? null)
                                setNewCompanyName(result.company_name)
                                toast.success('Unternehmensdaten wurden geladen.')
                              } else {
                                toast.error(result.error)
                              }
                            })
                            .finally(() => setEnrichLoading(false))
                        }}
                        onSelectCompany={(company) => {
                          setCompanyId(company.id)
                          setNewCompanyName(company.name)
                          setEnrichedLogoUrl(company.logo_url ?? null)
                          setEnrichLoading(true)
                          enrichAndSaveCompany(company.name)
                            .then((result) => {
                              if (result.success) {
                                setCompanyId(result.company_id)
                                setEnrichedCompany({
                                  id: result.company_id,
                                  name: result.company_name,
                                  logo_url: result.logo_url ?? null,
                                })
                                setWebsite(result.website_url ?? '')
                                setIndustry(result.industry ?? '')
                                setCountry(result.country ?? '')
                                setHeadquarters(result.headquarters ?? '')
                                setEmployeeCount(
                                  result.employee_count != null
                                    ? String(result.employee_count)
                                    : ''
                                )
                                setEnrichedLogoUrl(result.logo_url ?? null)
                                setNewCompanyName(result.company_name)
                                toast.success('Unternehmensdaten wurden geladen.')
                              }
                            })
                            .finally(() => setEnrichLoading(false))
                        }}
                        loading={enrichLoading}
                        disabled={submitting}
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
                  type="number"
                  inputMode="numeric"
                  placeholder="z. B. 12000"
                  disabled={submitting}
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
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
                        ourSolution
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
            </div>

            {/* Storytelling: Herausforderung & Lösung */}
            <div className="space-y-3">
              <div className="space-y-1">
                <OptionalLabel htmlFor="customer_challenge">
                  Herausforderung des Kunden
                </OptionalLabel>
                <Textarea
                  id="customer_challenge"
                  name="customer_challenge"
                  placeholder="Welche Herausforderung oder welches Ziel hatte der Kunde?"
                  rows={4}
                  disabled={submitting}
                  value={customerChallenge}
                  onChange={(e) => setCustomerChallenge(e.target.value)}
                  className="text-sm leading-relaxed"
                />
              </div>
              <div className="space-y-1">
                <OptionalLabel htmlFor="our_solution">Unsere Lösung</OptionalLabel>
                <Textarea
                  id="our_solution"
                  name="our_solution"
                  placeholder="Wie haben wir die Herausforderung gelöst?"
                  rows={4}
                  disabled={submitting}
                  value={ourSolution}
                  onChange={(e) => setOurSolution(e.target.value)}
                  className="text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <OptionalLabel htmlFor="tags-input">Tags</OptionalLabel>
              <input type="hidden" name="tags" value={tags.join(' ')} />
              <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
                      ? 'z.B. Cloud, Cybersecurity, SAP (mehrere Themen durch Komma trennen)'
                      : 'Weiterer Tag…'
                  }
                  disabled={submitting}
                  value={tagInputValue}
                  onChange={(e) => setTagInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === ',') {
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
                  className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
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
              Feld wird aktiviert, sobald oben ein Unternehmen ausgewählt wurde.
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
        <div className="space-y-2">
          <OptionalLabel htmlFor="project_end">Projektende</OptionalLabel>
          <Input
            id="project_end"
            name="project_end"
            type="date"
            disabled={submitting || projectStatus === 'active'}
            value={projectStatus === 'active' ? '' : projectEnd}
            onChange={(e) => setProjectEnd(e.target.value)}
            required={projectStatus === 'completed'}
          />
          <p className="text-muted-foreground text-[10px] italic">
            {projectStatus === 'completed'
              ? 'Bei abgeschlossenen Projekten erforderlich.'
              : projectStatus === 'active'
                ? 'Bei aktivem Projekt nicht relevant.'
                : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <OptionalLabel htmlFor="volume_eur">Volumen (€)</OptionalLabel>
          <Input
            id="volume_eur"
            name="volume_eur"
            type="text"
            inputMode="numeric"
            placeholder="z. B. 5.000.000"
            disabled={submitting}
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
        </div>
        <div className="space-y-2">
          <OptionalLabel htmlFor="contract_type">Vertragsart</OptionalLabel>
          <input type="hidden" name="contract_type" value={contractType} />
          <Select
            value={contractType || undefined}
            onValueChange={setContractType}
            disabled={submitting}
          >
            <SelectTrigger id="contract_type" className="w-full">
              <SelectValue placeholder="Auswählen …" />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <OptionalLabel htmlFor="incumbent_provider">
            Aktueller Dienstleister (Incumbent)
          </OptionalLabel>
          <div className="relative">
            <Input
              id="incumbent_provider"
              name="incumbent_provider"
              placeholder="z. B. bisheriger Anbieter"
              disabled={submitting}
              value={incumbentProvider}
              onChange={async (e) => {
                const value = e.target.value
                setIncumbentProvider(value)
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
            />
            {incumbentSuggestions.length > 0 && incumbentProvider.trim() && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                <Command>
                  <CommandList>
                    {incumbentSuggestions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={(val) => {
                          setIncumbentProvider(val)
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
          <div className="space-y-1">
            <input
              type="hidden"
              name="competitors"
              value={competitors}
            />
            <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
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
                <Input
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
                  className="border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
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
          <OptionalLabel htmlFor="nda_deal">
            Vertraulicher NDA Deal?
          </OptionalLabel>
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

  return (
    <div className="w-full max-w-4xl min-w-0 pb-6">
      <Card className="border-0 shadow-none">
        <CardContent className="px-0">
          {isEditMode ? (
            <form
              id={formId}
              noValidate
              onSubmit={handleEditSubmit}
              className="w-full min-w-0 space-y-6"
            >
              {renderFormContent()}
            </form>
          ) : (
            <form
              id={formId}
              noValidate
              onSubmit={handleCreateSubmit}
              className="w-full min-w-0 space-y-6"
            >
              {renderFormContent()}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Sticky Action Bar innerhalb des Formular-Containers */}
      <div className="sticky bottom-0 z-40 border-t bg-background/80 backdrop-blur mt-6">
        <div className="flex items-center justify-end gap-3 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() =>
              onClose ? onClose() : router.push(ROUTES.home)
            }
          >
            Abbrechen
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting}
          >
            <AppIcon icon={CirclePlus} size={16} className="mr-2" />
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
}
