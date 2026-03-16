'use client'

import { useState, useRef, useEffect, type ComponentProps, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Building2Icon, Plus, Sparkles, Mail, Phone } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { createReference, enrichAndSaveCompany, fetchCompanyEnrichment, searchCompanySuggestions } from './actions'
import {
  updateReference,
  generateSummaryFromStory,
  getIncumbentSuggestions,
  getCompetitorSuggestions,
} from '../actions'
import { extractDataFromDocument } from './extract-reference-data'
import { CreateContactDialog, type CreatedContact } from './create-contact-dialog'
import type { ExternalContact } from './actions'

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

type Company = { id: string; name: string; logo_url?: string | null }

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
  const [companyId, setCompanyId] = useState('')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [summary, setSummary] = useState(initialData?.summary ?? '')
  const [industry, setIndustry] = useState(initialData?.industry ?? '')
  const [country, setCountry] = useState(initialData?.country ?? '')
  const [headquarters, setHeadquarters] = useState('')
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
  const statusBeforeAnonymizedRef = useRef<ReferenceFormInitialData['status']>(
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [enrichedLogoUrl, setEnrichedLogoUrl] = useState<string | null>(initialData?.company_logo_url ?? null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichedCompany, setEnrichedCompany] = useState<Company | null>(null)
  const enrichDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const handleCustomerContactCreated = (contact: ExternalContact | CreatedContact, _role?: string) => {
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

  function buildFormData(form: HTMLFormElement): FormData {
    const formData = new FormData(form)
    if (selectedFile) {
      formData.set('file', selectedFile)
    }
    formData.set('tags', tags.join(','))
    formData.set('nda_deal', ndaDeal ? '1' : '0')
    if (volumeEur) {
      const normalizedVolume = volumeEur.replace(/\./g, '')
      formData.set('volume_eur', normalizedVolume)
    }
    formData.set('customer_contact_id', customer_contact_id === '__none__' ? '' : customer_contact_id)
    const selectedCustomer = displayCustomerContacts.find((c) => c.id === customer_contact_id)
    const customerDisplay =
      selectedCustomer
        ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') +
          (selectedCustomer.role ? `, ${selectedCustomer.role}` : '')
        : ''
    formData.set('customer_contact', customerDisplay)
    return formData
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      toast.error('Titel ist ein Pflichtfeld.')
      return
    }
    if (!isEditMode && !companyId && !newCompanyName.trim()) {
      toast.error('Unternehmen ist ein Pflichtfeld.')
      return
    }
    if (contactId === '__none__' || !contactId) {
      toast.error('Ansprechpartner intern ist ein Pflichtfeld.')
      return
    }
    if (projectStatus === '__none__' || !projectStatus) {
      toast.error('Projektstatus ist ein Pflichtfeld.')
      return
    }
    if (!projectStart.trim()) {
      toast.error('Projektstart ist ein Pflichtfeld.')
      return
    }
    if (projectStatus === 'completed' && !projectEnd.trim()) {
      toast.error('Bei abgeschlossenem Projekt ist das Projektende erforderlich.')
      return
    }
    setCreateSubmitting(true)
    const form = event.currentTarget
    const formData = buildFormData(form)
    try {
      const result = await createReference(formData)
      if (result.success) {
        toast.success('Referenz wurde angelegt.')
        if (onSuccess) {
          onSuccess()
          router.refresh()
        } else {
          router.push('/dashboard')
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

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!initialData?.id) return
    if (!title.trim()) {
      toast.error('Titel ist ein Pflichtfeld.')
      return
    }
    if (contactId === '__none__' || !contactId) {
      toast.error('Ansprechpartner intern ist ein Pflichtfeld.')
      return
    }
    if (projectStatus === '__none__' || !projectStatus) {
      toast.error('Projektstatus ist ein Pflichtfeld.')
      return
    }
    if (!projectStart.trim()) {
      toast.error('Projektstart ist ein Pflichtfeld.')
      return
    }
    if (projectStatus === 'completed' && !projectEnd.trim()) {
      toast.error('Bei abgeschlossenem Projekt ist das Projektende erforderlich.')
      return
    }
    setEditSubmitting(true)
    const formData = buildFormData(event.currentTarget)
    try {
      await updateReference(initialData.id, formData)
      toast.success('Referenz erfolgreich aktualisiert')
      if (onSuccess) {
        onSuccess()
        router.refresh()
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleMagicImport(file: File) {
    const formData = new FormData()
    formData.set('file', file)
    setMagicImportLoading(true)
    try {
      const result = await extractDataFromDocument(formData)
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
                        <Loader2 className="size-4 animate-spin" />
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
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
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
                  <Mail className="size-3.5" />
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
                    <Mail className="size-3.5" />
                    {c.email}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:underline">
                    <Phone className="size-3.5" />
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
                      className="rounded-full px-1 hover:bg-amber-500/20"
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
                  className="border-0 bg-transparent p-0 text-sm outline-none placeholder:text-amber-900/70 dark:placeholder:text-amber-200/80"
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
              onSubmit={handleEditSubmit}
              className="w-full min-w-0 space-y-6"
            >
              {renderFormContent()}
            </form>
          ) : (
            <form
              id={formId}
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
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? 'Änderungen speichern' : 'Erstellen'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() =>
              onClose ? onClose() : router.push('/dashboard')
            }
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  )
}

function FileDropZone({
  selectedFile,
  onFileSelect,
  disabled,
  existingFilePath,
}: {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled: boolean
  existingFilePath?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file?.type === 'application/pdf') {
      onFileSelect(file)
    } else if (file) {
      toast.error('Bitte nur PDF-Dateien hochladen.')
    }
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    onFileSelect(file ?? null)
  }
  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const displayName = selectedFile?.name ?? (existingFilePath ? existingFilePath.split('/').pop() : null)

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
        aria-hidden
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        {displayName ? (
          <>
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                onFileSelect(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              Entfernen
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">
            PDF hier ablegen oder klicken zum Auswählen
          </span>
        )}
      </div>
    </div>
  )
}

function LogoDropZone({
  selectedFile,
  onFileSelect,
  disabled,
  enrichedLogoUrl = null,
}: {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled: boolean
  enrichedLogoUrl?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [logoOnDarkBg, setLogoOnDarkBg] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    } else {
      onFileSelect(null)
    }
  }

  const handleLogoLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const width = (canvas.width = 8)
      const height = (canvas.height = 8)
      ctx.drawImage(img, 0, 0, width, height)
      const data = ctx.getImageData(0, 0, width, height).data
      let sum = 0
      const pixels = width * height
      for (let i = 0; i < pixels; i++) {
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const b = data[i * 4 + 2]
        sum += (r + g + b) / 3
      }
      const avg = sum / pixels
      setLogoOnDarkBg(avg > 210)
    } catch {
      // Canvas-Zugriff kann bei externen Bildern fehlschlagen (CORS) – dann einfach Standard-Hintergrund nutzen.
    }
  }

  const showEnrichedLogo = !selectedFile && enrichedLogoUrl

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        aria-hidden
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex min-h-[72px] min-w-[72px] w-20 h-20 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 text-center text-[11px] text-muted-foreground transition-colors',
          showEnrichedLogo
            ? 'border border-muted-foreground/25 bg-background'
            : isDragging
              ? 'border-primary bg-primary/5'
              : 'border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
          disabled ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {selectedFile ? (
          <span className="px-1">{selectedFile.name}</span>
        ) : showEnrichedLogo ? (
          <div
            className={[
              'flex h-full w-full items-center justify-center rounded-md',
              logoOnDarkBg ? 'bg-neutral-900' : 'bg-transparent',
            ].join(' ')}
          >
            <img
              src={enrichedLogoUrl}
              alt="Firmenlogo"
              className="max-h-full max-w-full object-contain p-1"
              onLoad={handleLogoLoaded}
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <span>Logo hier ablegen oder klicken</span>
        )}
      </div>
    </div>
  )
}

function MagicImportDropzone({
  onFileAccept,
  loading,
  disabled,
}: {
  onFileAccept: (file: File) => void
  loading: boolean
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const acceptTypes =
    'application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx'

  const MAX_SIZE_BYTES = 4.5 * 1024 * 1024 // 4.5MB
  const validateAndAccept = (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Datei zu groß für automatische Erkennung (Max 4.5MB).')
      return
    }
    const ok =
      file.type === 'application/pdf' ||
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|pptx|doc|docx)$/i.test(file.name)
    if (ok) onFileAccept(file)
    else toast.error('Nur Word-, PowerPoint- oder PDF-Dateien werden unterstützt.')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !loading) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || loading) return
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndAccept(file)
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndAccept(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        className="hidden"
        onChange={handleChange}
        aria-hidden
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && !loading && inputRef.current?.click()}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          isDragging && !loading ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30',
          (disabled || loading) ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        {loading ? (
          <>
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
            <span className="text-muted-foreground text-sm font-medium">
              KI analysiert Dokument… Bitte warten (bis zu 30 Sek.)
            </span>
          </>
        ) : (
          <>
            <p className="text-foreground text-sm font-medium">
              Hast du schon ein Referenzdokument?
            </p>
            <p className="text-muted-foreground max-w-md text-sm">
              Lege jetzt deine Word, PowerPoint, oder PDF-Datei hier ab, um das Formular automatisch zu befüllen.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function CompanyCombobox({
  companies,
  value,
  onValueChange,
  onSelectCompany,
  onConfirmValue,
  loading,
  disabled,
}: {
  companies: Company[]
  value: string
  onValueChange: (value: string) => void
  onSelectCompany: (company: Company) => void
  onConfirmValue?: (value: string) => void
  loading: boolean
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [remoteSuggestions, setRemoteSuggestions] = useState<Company[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trimmed = value.trim().toLowerCase()
  const localFiltered = companies.filter((c) =>
    trimmed ? c.name.toLowerCase().includes(trimmed) : true
  )
  const mergedSuggestions: Company[] = [
    ...localFiltered,
    ...remoteSuggestions.filter(
      (r) => !companies.some((c) => c.id === r.id)
    ),
  ]
  const showList = open && value.trim().length > 0

  useEffect(() => {
    const q = value.trim()
    if (!q) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      setRemoteSuggestions([])
      setSearching(false)
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setSearching(true)
      searchCompanySuggestions(q)
        .then((result) => {
          if (result.success) {
            const suggestions = (result.suggestions ?? []).map<Company>((s) => ({
              id: s.id,
              name: s.name,
              logo_url: s.logo_url ?? null,
            }))
            setRemoteSuggestions(suggestions)
          } else {
            console.error('Unternehmenssuche fehlgeschlagen:', result.error)
            setRemoteSuggestions([])
          }
        })
        .finally(() => {
          setSearching(false)
        })
    }, 300)
  }, [value])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  return (
    <Popover open={showList} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value)
            const next = e.target.value.trim().length > 0
            setOpen(next)
          }}
          onFocus={() => {
            if (value.trim().length > 0) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const current = e.currentTarget.value.trim()
              if (!current) return
              e.preventDefault()
              setOpen(false)
              onConfirmValue?.(current)
            }
          }}
          placeholder="Unternehmen eingeben"
          className="w-full cursor-text"
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-60 overflow-y-auto py-1 text-sm">
          {mergedSuggestions.map((company) => (
            <button
              key={company.id}
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left hover:bg-muted"
              onClick={() => {
                onSelectCompany(company)
                setOpen(false)
              }}
            >
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt=""
                  className="h-5 w-5 flex-shrink-0 rounded object-contain"
                />
              ) : (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                  <Building2Icon className="h-3 w-3" />
                </span>
              )}
              <span className="truncate">{company.name}</span>
            </button>
          ))}
          {mergedSuggestions.length === 0 && !searching && !loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Keine Treffer. Neuer Name wird verwendet.
            </div>
          )}
          {(searching || loading) && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Suche nach Unternehmen …
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
