'use client'

import { useActionState, useState } from 'react'
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
import { createReference, type CreateReferenceResult } from './actions'
import { updateReference } from '../actions'

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
  { value: 'pending', label: 'Ausstehend' },
  { value: 'approved', label: 'Freigegeben' },
] as const

type Company = { id: string; name: string }

export type ReferenceFormInitialData = {
  id: string
  company_id: string
  company_name: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: 'draft' | 'pending' | 'approved'
  file_path?: string | null
}

function formAction(
  _prev: CreateReferenceResult | null,
  formData: FormData
): Promise<CreateReferenceResult> {
  return createReference(formData)
}

export function ReferenceForm({
  companies = [],
  initialData,
}: {
  companies?: Company[]
  initialData?: ReferenceFormInitialData
}) {
  const router = useRouter()
  const [state, formActionWithState, isPending] = useActionState(formAction, null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [industry, setIndustry] = useState(initialData?.industry ?? '')
  const [country, setCountry] = useState(initialData?.country ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'draft')

  const isEditMode = !!initialData
  const submitting = isEditMode ? editSubmitting : isPending

  if (state?.success) {
    toast.success('Referenz wurde angelegt.')
    router.push('/dashboard')
    router.refresh()
  }
  if (state && !state.success && 'error' in state) {
    toast.error(state.error)
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!initialData?.id) return
    setEditSubmitting(true)
    const formData = new FormData(event.currentTarget)
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
      {/* Unternehmen: im Edit-Modus Name bearbeitbar, sonst CompanySelect */}
      <div className="space-y-2">
        <Label htmlFor={isEditMode ? 'company_name' : 'companyId'}>
          Unternehmen
        </Label>
        {isEditMode ? (
          <Input
            id="company_name"
            name="company_name"
            placeholder="z. B. Acme GmbH"
            required
            disabled={submitting}
            defaultValue={initialData.company_name}
          />
        ) : (
          <>
            <CompanySelect
              companies={companies}
              companyId={companyId}
              onCompanyIdChange={setCompanyId}
            />
          </>
        )}
      </div>

      {!isEditMode && (
        <div
          id="new-company-wrap"
          className={`space-y-2 ${companyId === '__new__' ? '' : 'hidden'}`}
        >
          <Label htmlFor="newCompanyName">Name der neuen Firma</Label>
          <Input
            id="newCompanyName"
            name="newCompanyName"
            placeholder="z. B. Acme GmbH"
            disabled={submitting}
          />
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
          <Label>Land</Label>
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

      <div className="space-y-2">
        <Label htmlFor="file">PDF Anhang</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          disabled={submitting}
        />
        {initialData?.file_path && (
          <p className="text-muted-foreground text-xs">
            Aktuell hinterlegt: {initialData.file_path.split('/').pop()}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <input type="hidden" name="status" value={status} />
        <Select
          value={status}
          onValueChange={setStatus}
          disabled={submitting}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <form action={formActionWithState} className="space-y-6">
            {formContent}
          </form>
        )}
      </CardContent>
    </Card>
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
