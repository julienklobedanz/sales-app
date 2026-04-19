'use client'

import { useEffect, useState } from 'react'
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

type AccountStatusOption = '__none__' | 'at_risk' | 'warmup' | 'expansion'

function statusFromCompany(raw: string | null): AccountStatusOption {
  if (raw === 'at_risk' || raw === 'warmup' || raw === 'expansion') return raw
  return '__none__'
}

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
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [headquarters, setHeadquarters] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [description, setDescription] = useState('')
  const [accountStatus, setAccountStatus] = useState<AccountStatusOption>('__none__')

  useEffect(() => {
    if (!open) return
    setName(company.name)
    setWebsiteUrl(displayHostFromUrl(company.website_url))
    setLogoUrl(company.logo_url ?? '')
    setIndustry(company.industry ?? '')
    setHeadquarters(company.headquarters ?? '')
    setEmployeeCount(
      company.employee_count != null && !Number.isNaN(company.employee_count)
        ? String(company.employee_count)
        : ''
    )
    setDescription(company.description ?? '')
    setAccountStatus(statusFromCompany(company.account_status))
  }, [open, company])

  const canSubmit = name.trim().length > 0 && !pending

  const submit = async () => {
    if (!canSubmit) return
    setPending(true)
    try {
      const employee =
        employeeCount.trim().length > 0 ? Number(employeeCount.trim()) : null
      if (employeeCount.trim().length > 0 && Number.isNaN(employee as number)) {
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
              disabled={pending}
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
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-logo">Logo-URL</Label>
            <Input
              id="edit-account-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-industry">Branche</Label>
            <Input
              id="edit-account-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="z. B. Manufacturing"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-hq">Ort</Label>
            <Input
              id="edit-account-hq"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="z. B. München, DE"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-account-employee">Mitarbeiter</Label>
            <Input
              id="edit-account-employee"
              inputMode="numeric"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              placeholder="z. B. 2500"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label>Account-Status</Label>
            <Select
              value={accountStatus}
              onValueChange={(v) => setAccountStatus(v as AccountStatusOption)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="— Keine Angabe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Keine Angabe</SelectItem>
                <SelectItem value="warmup">Warm-up</SelectItem>
                <SelectItem value="expansion">Expansion</SelectItem>
                <SelectItem value="at_risk">Account at Risk</SelectItem>
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
              disabled={pending}
              className="min-h-[90px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {pending && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
