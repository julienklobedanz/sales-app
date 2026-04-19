'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDeal } from '../actions'
import { DEAL_STATUS_LABELS, type DealStatus } from '../types'
import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { useRole } from '@/hooks/useRole'
import { DealQuickAccountDialog } from './deal-quick-account-dialog'
import {
  CompanyCombobox,
  type ReferenceFormCompany,
} from '@/app/dashboard/evidence/new/reference-form-fields'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

/** Nur Pipeline-Phasen bei Neuanlage (Terminal über „Ausgang festhalten“). */
const CREATE_DEAL_PHASES: DealStatus[] = ['negotiation', 'rfp']

export function DealForm({
  companies,
  orgProfiles,
}: {
  companies: Company[]
  orgProfiles: OrgProfile[]
}) {
  const router = useRouter()
  const { isAdmin, isAccountManager } = useRole()
  const canCreateAccount = isAdmin || isAccountManager
  const [pending, setPending] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [accountInput, setAccountInput] = useState('')
  const [extraCompanies, setExtraCompanies] = useState<Company[]>([])
  const [quickAccountOpen, setQuickAccountOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string
    account?: string
    volume?: string
  }>({})

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companies) map.set(c.id, c.name)
    for (const c of extraCompanies) map.set(c.id, c.name)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [companies, extraCompanies])

  const comboboxCompanies = useMemo<ReferenceFormCompany[]>(
    () => companyOptions.map((c) => ({ id: c.id, name: c.name, logo_url: null })),
    [companyOptions]
  )

  const [status, setStatus] = useState<DealStatus>('negotiation')
  const [isPublic, setIsPublic] = useState(true)
  const [accountManagerId, setAccountManagerId] = useState<string>('')
  const [salesManagerId, setSalesManagerId] = useState<string>('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const title = (fd.get('title')?.toString() ?? '').trim()
    const volumeRaw = (fd.get('volume')?.toString() ?? '').trim()

    const nextErrors: typeof fieldErrors = {}
    if (!title) nextErrors.title = 'Titel ist erforderlich.'
    if (!companyId) nextErrors.account = 'Bitte ein Account aus der Liste wählen.'
    if (!volumeRaw) nextErrors.volume = 'Volumen ist erforderlich.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setPending(true)
    const formData = new FormData(form)
    formData.set('company_id', companyId)
    formData.set('status', status)
    formData.set('is_public', isPublic ? 'true' : 'false')
    formData.set('account_manager_id', accountManagerId || '')
    formData.set('sales_manager_id', salesManagerId || '')
    const result = await createDeal(formData)
    setPending(false)
    if (result.success && result.id) {
      toast.success('Deal angelegt.')
      router.push(ROUTES.deals.detail(result.id))
      router.refresh()
    } else {
      toast.error(result.error ?? 'Fehler beim Anlegen.')
    }
  }

  return (
    <Card>
      <DealQuickAccountDialog
        open={quickAccountOpen}
        onOpenChange={setQuickAccountOpen}
        onCreated={(id, name) => {
          setExtraCompanies((prev) => {
            if (prev.some((c) => c.id === id)) return prev
            return [...prev, { id, name }]
          })
          setCompanyId(id)
          setAccountInput(name)
          router.refresh()
        }}
      />
      <CardHeader>
        <CardTitle>Neuer Deal</CardTitle>
        <CardDescription>
          Titel, Account (Suche), Volumen und Phase sind Pflicht. Optional: Beschreibung und Closing-Datum.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="z. B. Cloud-Migration BMW"
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.title)}
              onChange={() => fieldErrors.title && setFieldErrors((e) => ({ ...e, title: undefined }))}
            />
            {fieldErrors.title ? <p className="text-sm text-destructive">{fieldErrors.title}</p> : null}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label>Account *</Label>
              {canCreateAccount ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  disabled={pending}
                  onClick={() => setQuickAccountOpen(true)}
                >
                  {COPY.accounts.quickCreateAccountTitle}
                </Button>
              ) : null}
            </div>
            <CompanyCombobox
              companies={comboboxCompanies}
              value={accountInput}
              onValueChange={(v) => {
                setAccountInput(v)
                setCompanyId('')
                if (fieldErrors.account) setFieldErrors((e) => ({ ...e, account: undefined }))
              }}
              onSelectCompany={(c) => {
                setCompanyId(c.id)
                setAccountInput(c.name)
                if (fieldErrors.account) setFieldErrors((e) => ({ ...e, account: undefined }))
              }}
              loading={false}
              disabled={pending}
            />
            <input type="hidden" name="company_id" value={companyId} />
            {fieldErrors.account ? <p className="text-sm text-destructive">{fieldErrors.account}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Branche</Label>
              <Input id="industry" name="industry" placeholder="z. B. Automotive" disabled={pending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume">Volumen *</Label>
              <Input
                id="volume"
                name="volume"
                placeholder="z. B. €5 Mio"
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.volume)}
                onChange={() => fieldErrors.volume && setFieldErrors((e) => ({ ...e, volume: undefined }))}
              />
              {fieldErrors.volume ? <p className="text-sm text-destructive">{fieldErrors.volume}</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phase *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)} disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATE_DEAL_PHASES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DEAL_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Closing-Datum (optional)</Label>
            <Input id="expiry_date" name="expiry_date" type="date" disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requirements_text">Beschreibung (optional)</Label>
            <Textarea
              id="requirements_text"
              name="requirements_text"
              placeholder="Kontext, Scope, Must-haves …"
              rows={6}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label>Sichtbarkeit</Label>
            <Select value={isPublic ? 'public' : 'private'} onValueChange={(v) => setIsPublic(v === 'public')} disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Öffentlich (Team)</SelectItem>
                <SelectItem value="private">Privat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{COPY.roles.accountManager}</Label>
              <Select value={accountManagerId || '__none__'} onValueChange={(v) => setAccountManagerId(v === '__none__' ? '' : v)} disabled={pending}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{COPY.roles.salesManager}</Label>
              <Select value={salesManagerId || '__none__'} onValueChange={(v) => setSalesManagerId(v === '__none__' ? '' : v)} disabled={pending}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keiner —</SelectItem>
                  {orgProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={pending}>
              {pending && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
              Deal anlegen
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => router.push(ROUTES.deals.root)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
