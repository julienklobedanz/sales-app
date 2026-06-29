'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { createCompany } from './actions'
import { ROUTES } from '@/lib/routes'
import { COPY } from '@/lib/copy'
import {
  fetchCompanyEnrichment,
  type CompanySearchSuggestion,
} from '@/app/dashboard/references/new/actions'
import { CompanyNameSuggestField } from './components/company-name-suggest-field'
import { displayHostFromUrl, normalizeWebsiteForSave } from './account-company-helpers'
import {
  ACCOUNT_STATUS_FORM_OPTIONS,
  type AccountStatusFormValue,
} from '@/lib/accounts/company-account-status'
import { IndustrySelect } from '@/components/forms/industry-select'
import { resolveIndustryId } from '@/lib/constants/industries'
import { formatThousandsDots, parseThousandsDotsToInt } from '@/lib/format'

export function CreateAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [headquarters, setHeadquarters] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [description, setDescription] = useState('')
  const [accountStatus, setAccountStatus] = useState<AccountStatusFormValue>('__none__')

  const [debouncedEnrichQuery, setDebouncedEnrichQuery] = useState('')

  const enrichReqRef = useRef(0)
  const lastAutoQueryRef = useRef('')

  const resetForm = useCallback(() => {
    setName('')
    setWebsiteUrl('')
    setLogoUrl('')
    setIndustry('')
    setHeadquarters('')
    setEmployeeCount('')
    setDescription('')
    setAccountStatus('__none__')
    setDebouncedEnrichQuery('')
    lastAutoQueryRef.current = ''
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedEnrichQuery(name.trim()), 2000)
    return () => window.clearTimeout(t)
  }, [name])

  useEffect(() => {
    if (!open) return
    const query = debouncedEnrichQuery.trim()
    if (query.length < 2) return
    const normalized = query.toLowerCase()
    if (normalized === lastAutoQueryRef.current) return

    const reqId = ++enrichReqRef.current
    setEnriching(true)
    ;(async () => {
      const enriched = await fetchCompanyEnrichment(query)
      if (reqId !== enrichReqRef.current) return
      setEnriching(false)
      if (!enriched.success) return
      lastAutoQueryRef.current = normalized
      setName(enriched.company_name?.trim() || query)
      setWebsiteUrl(displayHostFromUrl(enriched.website_url))
      setIndustry(resolveIndustryId(enriched.industry ?? ''))
      setHeadquarters(enriched.headquarters?.trim() || enriched.country?.trim() || '')
      setEmployeeCount(
        enriched.employee_count != null ? formatThousandsDots(String(enriched.employee_count)) : ''
      )
      setDescription(enriched.description ?? '')
      setLogoUrl(enriched.logo_url ?? '')
    })()
  }, [debouncedEnrichQuery, open])

  const applySuggestion = async (s: CompanySearchSuggestion) => {
    if (!s.id.startsWith('brandfetch:')) {
      toast.info(COPY.accounts.createDialogOpenExisting)
      onOpenChange(false)
      resetForm()
      router.push(ROUTES.accountsDetail(s.id))
      return
    }

    const domain = s.id.slice('brandfetch:'.length)
    setEnriching(true)
    try {
      const res = await fetchCompanyEnrichment(s.name.trim() || domain)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      lastAutoQueryRef.current = res.company_name.trim().toLowerCase()
      setName(res.company_name)
      setWebsiteUrl(displayHostFromUrl(res.website_url))
      setIndustry(resolveIndustryId(res.industry ?? ''))
      setHeadquarters(res.headquarters?.trim() || res.country?.trim() || '')
      setEmployeeCount(
        res.employee_count != null ? formatThousandsDots(String(res.employee_count)) : ''
      )
      setDescription(res.description ?? '')
      setLogoUrl(res.logo_url ?? '')
      toast.success('Daten übernommen.')
    } finally {
      setEnriching(false)
    }
  }

  const canSubmit = name.trim().length > 0 && !pending && !enriching

  const submit = async () => {
    if (!canSubmit) return
    setPending(true)
    try {
      const employee =
        employeeCount.trim().length > 0 ? parseThousandsDotsToInt(employeeCount) : null
      if (employeeCount.trim().length > 0 && employee == null) {
        toast.error('Mitarbeiterzahl muss eine Zahl sein.')
        return
      }

      const res = await createCompany({
        name,
        website_url: normalizeWebsiteForSave(websiteUrl),
        logo_url: logoUrl || null,
        industry: industry || null,
        headquarters: headquarters || null,
        employee_count: employee,
        description: description || null,
        account_status: accountStatus === '__none__' ? null : accountStatus,
      })
      if (res.success && res.id) {
        toast.success('Account erstellt.')
        onOpenChange(false)
        resetForm()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Erstellen fehlgeschlagen.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && !enriching && onOpenChange(v)}>
      <DialogContent className="overflow-visible">
        <DialogHeader>
          <DialogTitle>Account hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name">Name</Label>
            <CompanyNameSuggestField
              id="account-name"
              value={name}
              onValueChange={setName}
              onSelectSuggestion={applySuggestion}
              disabled={pending}
              placeholder="z. B. ACME GmbH"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {enriching
                ? 'Markendaten werden geladen …'
                : COPY.accounts.createDialogNameHint}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-website">Website</Label>
            <Input
              id="account-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="acme.com"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-industry">Branche</Label>
            <IndustrySelect
              id="account-industry"
              value={industry}
              onValueChange={setIndustry}
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-hq">HQ</Label>
            <Input
              id="account-hq"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="z. B. München, DE"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-employee">Mitarbeiter</Label>
            <Input
              id="account-employee"
              inputMode="numeric"
              value={employeeCount}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setEmployeeCount(digits ? formatThousandsDots(digits) : '')
              }}
              placeholder="z. B. 10.001"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label>Account Status</Label>
            <Select
              value={accountStatus}
              onValueChange={(v) => setAccountStatus(v as AccountStatusFormValue)}
              disabled={pending || enriching}
            >
              <SelectTrigger>
                <SelectValue placeholder="— Keine Angabe" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_STATUS_FORM_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    title={opt.description || undefined}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-description">Beschreibung</Label>
            <Textarea
              id="account-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurzprofil, Besonderheiten, Kontext…"
              disabled={pending || enriching}
              className="min-h-[90px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending || enriching}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {(pending || enriching) && (
              <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
            )}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
