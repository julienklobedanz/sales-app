'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createReference, enrichAndSaveCompany, fetchCompanyEnrichment } from './actions'
import { updateReference } from '../actions'
import { CreateContactDialog } from './create-contact-dialog'

const INDUSTRIES = [
  'IT & Software',
  'Finanzdienstleistungen',
  'Gesundheitswesen',
  'Industrie & Produktion',
  'Handel',
  'Öffentlicher Sektor',
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
  { value: 'pending', label: 'In Prüfung' },
  { value: 'anonymous', label: 'Anonymisiert' },
  { value: 'restricted', label: 'Beschränkt' },
  { value: 'external', label: 'Extern' },
  { value: 'internal', label: 'Intern' },
] as const

const STATUS_HELP_TEXT: Record<
  ReferenceFormInitialData['status'],
  string
> = {
  draft: 'Nur intern sichtbar, nicht für Sales; Referenz ist noch in Bearbeitung.',
  pending:
    'Für Sales sichtbar; kann individuell beim Account Owner zur Freigabe angefragt werden.',
  anonymous:
    'Nutzung ohne Kundennamen/Kontaktdaten (Referenz darf genannt werden, aber anonymisiert).',
  restricted:
    'Nutzung nur nach Einzelfreigabe durch den Account Owner beim Kunden (Freigabeprozess per Anfrage).',
  external:
    'Vollständig freigegeben und für alle Bids nutzbar; Ansprechpartner steht für Referenzcalls bereit.',
  internal: 'Nur intern nutzbar, nicht extern teilbar.',
}

const PROJECT_STATUS_OPTIONS = [
  { value: '__none__', label: '— Keine Angabe' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
] as const

type Company = { id: string; name: string }

export type ContactPerson = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

export type ReferenceFormInitialData = {
  id: string
  company_id: string
  company_name: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  website?: string | null
  employee_count?: number | null
  volume_eur?: string | null
  contract_type?: string | null
  customer_contact?: string | null
  contact_id?: string | null
  status:
    | 'draft'
    | 'pending'
    | 'external'
    | 'internal'
    | 'anonymous'
    | 'restricted'
  file_path?: string | null
  tags?: string | null
  project_status?: 'active' | 'completed' | null
  project_start?: string | null
  project_end?: string | null
}

export function ReferenceForm({
  companies = [],
  contacts = [],
  initialData,
}: {
  companies?: Company[]
  contacts?: ContactPerson[]
  initialData?: ReferenceFormInitialData
}) {
  const router = useRouter()
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [industry, setIndustry] = useState(initialData?.industry ?? '')
  const [country, setCountry] = useState(initialData?.country ?? '')
  const [website, setWebsite] = useState(initialData?.website ?? '')
  const [employeeCount, setEmployeeCount] = useState(
    initialData?.employee_count != null ? `${initialData.employee_count}` : ''
  )
  const [volumeEur, setVolumeEur] = useState(initialData?.volume_eur ?? '')
  const [contractType, setContractType] = useState(
    initialData?.contract_type ?? ''
  )
  const [status, setStatus] = useState<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft'
  )
  const [ndaDeal, setNdaDeal] = useState(false)
  const statusBeforeNdaRef = useRef<ReferenceFormInitialData['status']>(
    initialData?.status ?? 'draft'
  )
  const [contactId, setContactId] = useState(
    initialData?.contact_id ? initialData.contact_id : '__none__'
  )
  const [tags, setTags] = useState<string[]>(() =>
    initialData?.tags
      ? initialData.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  )
  const [tagInputValue, setTagInputValue] = useState('')
  const [projectStatus, setProjectStatus] = useState(
    initialData?.project_status ?? '__none__'
  )
  const [projectStart, setProjectStart] = useState(
    initialData?.project_start ?? ''
  )
  const [projectEnd, setProjectEnd] = useState(initialData?.project_end ?? '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichedCompany, setEnrichedCompany] = useState<Company | null>(null)
  const enrichDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editCompanyName, setEditCompanyName] = useState(initialData?.company_name ?? '')
  const editEnrichDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEditMode = !!initialData
  const displayCompanies = enrichedCompany && !companies.some((c) => c.id === enrichedCompany.id)
    ? [...companies, enrichedCompany]
    : companies

  useEffect(() => {
    const trimmed = newCompanyName.trim()
    if (trimmed.length < 2) return
    if (enrichDebounceRef.current) clearTimeout(enrichDebounceRef.current)
    enrichDebounceRef.current = setTimeout(() => {
      enrichDebounceRef.current = null
      setEnrichLoading(true)
      enrichAndSaveCompany(newCompanyName.trim())
        .then((result) => {
          if (result.success) {
            setCompanyId(result.company_id)
            setEnrichedCompany({ id: result.company_id, name: result.company_name })
            setWebsite(result.website_url ?? '')
            setIndustry(result.industry ?? '')
            setCountry(result.country ?? '')
            setEmployeeCount(result.employee_count != null ? String(result.employee_count) : '')
            setNewCompanyName('')
            toast.success('Unternehmensdaten wurden geladen.')
          } else {
            toast.error(result.error)
          }
        })
        .finally(() => setEnrichLoading(false))
    }, 800)
    return () => {
      if (enrichDebounceRef.current) clearTimeout(enrichDebounceRef.current)
    }
  }, [newCompanyName])

  useEffect(() => {
    if (!isEditMode) return
    const trimmed = editCompanyName.trim()
    if (trimmed.length < 2) return
    if (editEnrichDebounceRef.current) clearTimeout(editEnrichDebounceRef.current)
    editEnrichDebounceRef.current = setTimeout(() => {
      editEnrichDebounceRef.current = null
      setEnrichLoading(true)
      fetchCompanyEnrichment(editCompanyName.trim())
        .then((result) => {
          if (result.success) {
            setEditCompanyName(result.company_name)
            setWebsite(result.website_url ?? '')
            setIndustry(result.industry ?? '')
            setCountry(result.country ?? '')
            setEmployeeCount(result.employee_count != null ? String(result.employee_count) : '')
            toast.success('Unternehmensdaten wurden geladen.')
          } else {
            toast.error(result.error)
          }
        })
        .finally(() => setEnrichLoading(false))
    }, 800)
    return () => {
      if (editEnrichDebounceRef.current) clearTimeout(editEnrichDebounceRef.current)
    }
  }, [isEditMode, editCompanyName])

  const submitting = isEditMode ? editSubmitting : createSubmitting

  const handleContactCreated = (newId: string) => {
    setContactId(newId)
    router.refresh()
  }

  function buildFormData(form: HTMLFormElement): FormData {
    const formData = new FormData(form)
    if (selectedFile) {
      formData.set('file', selectedFile)
    }
    formData.set('tags', tags.join(', '))
    return formData
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        router.push('/dashboard')
        router.refresh()
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
    if (projectStatus === 'completed' && !projectEnd.trim()) {
      toast.error('Bei abgeschlossenem Projekt ist das Projektende erforderlich.')
      return
    }
    setEditSubmitting(true)
    const formData = buildFormData(event.currentTarget)
    try {
      await updateReference(initialData.id, formData)
      toast.success('Referenz erfolgreich aktualisiert')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setEditSubmitting(false)
    }
  }

  const formContent = (
    <>
      {/* Unternehmen + Logo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] items-start">
        <div className="space-y-2">
          <Label htmlFor={isEditMode ? 'company_name' : 'companyId'}>
            Unternehmen
          </Label>
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
                  <Loader2 className="size-4 animate-spin" />
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <CompanySelect
                  companies={displayCompanies}
                  companyId={companyId}
                  onCompanyIdChange={setCompanyId}
                />
                {companyId === '__new__' && enrichLoading && (
                  <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 sm:flex sm:flex-col sm:items-end">
          <Label htmlFor="logo">Logo (optional)</Label>
          <LogoDropZone
            selectedFile={logoFile}
            onFileSelect={setLogoFile}
            disabled={submitting}
          />
        </div>
      </div>

      {!isEditMode && (
        <div
          id="new-company-wrap"
          className={`space-y-2 ${companyId === '__new__' ? '' : 'hidden'}`}
        >
          <Label htmlFor="newCompanyName">Name der neuen Firma oder Domain (z. B. siemens.de)</Label>
          <div className="relative">
            <Input
              id="newCompanyName"
              name="newCompanyName"
              placeholder="z. B. Acme GmbH oder siemens.de für Auto-Fill"
              disabled={submitting}
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
            />
            {enrichLoading && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          name="title"
          placeholder="z. B. Cloud Transformation 2024"
          required
          disabled={submitting}
          defaultValue={initialData?.title}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Zusammenfassung</Label>
        <Textarea
          id="summary"
          name="summary"
          placeholder="Kurze Beschreibung der Referenz …"
          rows={4}
          disabled={submitting}
          defaultValue={initialData?.summary ?? ''}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags-input">Tags</Label>
        <input type="hidden" name="tags" value={tags.join(', ')} />
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
            placeholder={tags.length === 0 ? 'z. B. Cloud, ERP, SAP (Komma für neue Kapsel)' : 'Weiterer Tag…'}
            disabled={submitting}
            value={tagInputValue}
            onChange={(e) => setTagInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === ',') {
                e.preventDefault()
                const value = tagInputValue.trim()
                if (value) {
                  setTags((prev) => [...prev, value])
                  setTagInputValue('')
                }
              }
            }}
            className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-muted-foreground text-xs">Eingabe mit Komma abschließen, um einen Tag als Kapsel zu übernehmen.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactId">Interner Kontakt / Account Owner</Label>
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
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                      c.email ||
                      c.id}
                    {c.email ? ` (${c.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CreateContactDialog onContactCreated={handleContactCreated} />
        </div>
        <p className="text-muted-foreground text-xs">
          Wird für Freigabe-Anfragen per E-Mail benachrichtigt.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer_contact">Kundenansprechpartner</Label>
        <Input
          id="customer_contact"
          name="customer_contact"
          placeholder="z. B. Max Mustermann, CIO"
          disabled={submitting}
          defaultValue={initialData?.customer_contact ?? ''}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Industrie</Label>
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
          <Label>HQ</Label>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
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
        <div className="space-y-2">
          <Label htmlFor="employee_count">Mitarbeiteranzahl</Label>
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

      <div className="space-y-2">
        <Label htmlFor="project_status">Projektstatus</Label>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project_start">Projektstart</Label>
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
          <Label htmlFor="project_end">
            Projektende
            {projectStatus === 'completed' && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            id="project_end"
            name="project_end"
            type="date"
            disabled={submitting || projectStatus === 'active'}
            value={projectStatus === 'active' ? '' : projectEnd}
            onChange={(e) => setProjectEnd(e.target.value)}
            required={projectStatus === 'completed'}
          />
          <p className="text-muted-foreground text-xs">
            {projectStatus === 'completed'
              ? 'Bei abgeschlossenen Projekten erforderlich.'
              : projectStatus === 'active'
                ? 'Bei aktivem Projekt nicht relevant.'
                : 'Optional, bei aktivem Projekt leer lassen.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="volume_eur">Volumen (€)</Label>
          <Input
            id="volume_eur"
            name="volume_eur"
            placeholder="z. B. €5M"
            disabled={submitting}
            value={volumeEur}
            onChange={(e) => setVolumeEur(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contract_type">Vertragsart</Label>
          <Input
            id="contract_type"
            name="contract_type"
            placeholder="z. B. Time & Material oder Fixed Term Contract"
            disabled={submitting}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>PDF Anhang</Label>
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
          <Label htmlFor="status">Status / Freigabestufe</Label>
          <input type="hidden" name="status" value={status} />
          <Select
            value={status}
            onValueChange={(val) => {
              const next = val as ReferenceFormInitialData['status']
              setStatus(next)
              if (ndaDeal && next !== 'internal') {
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

        <div className="space-y-2">
          <Label htmlFor="nda_deal">NDA Deal</Label>
          <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
            <input
              id="nda_deal"
              type="checkbox"
              checked={ndaDeal}
              disabled={submitting}
              onChange={(e) => {
                const checked = e.target.checked
                setNdaDeal(checked)
                if (checked) {
                  statusBeforeNdaRef.current = status
                  setStatus('internal')
                } else {
                  setStatus(statusBeforeNdaRef.current ?? 'draft')
                }
              }}
              className="h-4 w-4 rounded border-muted-foreground/40"
            />
            <span className="text-sm text-muted-foreground">
              Markiert diese Referenz automatisch als intern.
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Änderungen speichern' : 'Referenz anlegen'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => router.push('/dashboard')}
        >
          Abbrechen
        </Button>
      </div>
    </>
  )

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {isEditMode ? 'Referenz bearbeiten' : 'Neue Referenz'}
        </CardTitle>
        <CardDescription>
          {isEditMode
            ? 'Daten der Referenz anpassen.'
            : 'Referenz anlegen und optional ein neues Unternehmen hinzufügen.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditMode ? (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {formContent}
          </form>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            {formContent}
          </form>
        )}
      </CardContent>
    </Card>
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
}: {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  disabled: boolean
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
          'flex aspect-square max-w-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-[11px] text-muted-foreground transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
          disabled ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {selectedFile ? (
          <span className="px-1">{selectedFile.name}</span>
        ) : (
          <span>Logo hier ablegen oder klicken</span>
        )}
      </div>
    </div>
  )
}

function CompanySelect({
  companies,
  companyId,
  onCompanyIdChange,
}: {
  companies: Company[]
  companyId: string
  onCompanyIdChange: (value: string) => void
}) {
  return (
    <>
      <input type="hidden" name="companyId" value={companyId} />
      <Select
        value={companyId || undefined}
        onValueChange={(value) => {
          onCompanyIdChange(value ?? '')
          const wrap = document.getElementById('new-company-wrap')
          if (wrap) {
            wrap.classList.toggle('hidden', value !== '__new__')
          }
        }}
      >
        <SelectTrigger className="w-full" id="companyId">
          <SelectValue placeholder="Unternehmen wählen …" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
          <SelectItem value="__new__">Neue Firma anlegen</SelectItem>
        </SelectContent>
      </Select>
    </>
  )
}
