'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { updateCompany } from './actions'
import { COPY } from '@/lib/copy'
import type { CompanyDetailCompany } from './company-detail-types'
import { displayHostFromUrl, normalizeWebsiteForSave } from './account-company-helpers'
import { fetchCompanyEnrichment, searchCompanySuggestions } from '@/app/dashboard/evidence/new/actions'
import {
  ACCOUNT_STATUS_FORM_OPTIONS,
  accountStatusFromDb,
  type AccountStatusFormValue,
} from '@/lib/accounts/company-account-status'
import { formatThousandsDots, parseThousandsDotsToInt } from '@/lib/format'

export function EditAccountDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: CompanyDetailCompany
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
  const [debouncedName, setDebouncedName] = useState('')
  const enrichReqRef = useRef(0)
  const lastAutoQueryRef = useRef('')

  useEffect(() => {
    if (!open) return
    setName(company.name)
    setWebsiteUrl(displayHostFromUrl(company.website_url))
    setLogoUrl(company.logo_url ?? '')
    setIndustry(company.industry ?? '')
    setHeadquarters(company.headquarters ?? '')
    setEmployeeCount(
      company.employee_count != null && !Number.isNaN(company.employee_count)
        ? formatThousandsDots(String(company.employee_count))
        : ''
    )
    setDescription(company.description ?? '')
    setAccountStatus(accountStatusFromDb(company.account_status))
    setDebouncedName('')
    lastAutoQueryRef.current = ''
  }, [open, company])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => setDebouncedName(name.trim()), 2000)
    return () => window.clearTimeout(t)
  }, [name, open])

  useEffect(() => {
    if (!open) return
    const query = debouncedName.trim()
    if (query.length < 2) return
    const normalized = query.toLowerCase()
    if (normalized === lastAutoQueryRef.current) return
    const reqId = ++enrichReqRef.current
    setEnriching(true)
    ;(async () => {
      let enrichInput: string | null = null
      const suggestions = await searchCompanySuggestions(query)
      if (suggestions.success) {
        const brandfetchCandidate = suggestions.suggestions.find((s) => s.id.startsWith('brandfetch:'))
        if (brandfetchCandidate) {
          enrichInput = brandfetchCandidate.id.slice('brandfetch:'.length)
        }
      }
      if (!enrichInput && query.includes('.')) {
        enrichInput = query
      }
      if (!enrichInput) {
        if (reqId === enrichReqRef.current) setEnriching(false)
        return
      }
      const enriched = await fetchCompanyEnrichment(enrichInput)
      if (reqId !== enrichReqRef.current) return
      setEnriching(false)
      if (!enriched.success) return
      lastAutoQueryRef.current = normalized
      setName(enriched.company_name?.trim() || query)
      setWebsiteUrl(displayHostFromUrl(enriched.website_url))
      setLogoUrl(enriched.logo_url ?? '')
      setIndustry(enriched.industry ?? '')
      setHeadquarters(enriched.headquarters?.trim() || enriched.country?.trim() || '')
      setEmployeeCount(
        enriched.employee_count != null ? formatThousandsDots(String(enriched.employee_count)) : ''
      )
      setDescription(enriched.description ?? '')
    })()
  }, [debouncedName, open])

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

      const res = await updateCompany({
        id: company.id,
        name: name.trim(),
        website_url: normalizeWebsiteForSave(websiteUrl),
        logo_url: logoUrl.trim() || null,
        industry: industry.trim() || null,
        headquarters: headquarters.trim() || null,
        employee_count: employee,
        description: description.trim() || null,
        account_status: accountStatus === '__none__' ? null : accountStatus,
      })
      if (res.success) {
        toast.success(COPY.accounts.editSuccess)
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{COPY.accounts.editDialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-account-name">Name</Label>
            <Input
              id="edit-account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. ACME GmbH"
              disabled={pending || enriching}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-website">Website</Label>
            <Input
              id="edit-account-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="acme.com"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-logo">Logo-URL</Label>
            <Input
              id="edit-account-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-industry">Branche</Label>
            <Input
              id="edit-account-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="z. B. Manufacturing"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-hq">HQ</Label>
            <Input
              id="edit-account-hq"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="z. B. München, DE"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-employee">Mitarbeiter</Label>
            <Input
              id="edit-account-employee"
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
            <Label>Account-Status</Label>
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
            <Label htmlFor="edit-account-description">Beschreibung</Label>
            <Textarea
              id="edit-account-description"
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
            {(pending || enriching) && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
