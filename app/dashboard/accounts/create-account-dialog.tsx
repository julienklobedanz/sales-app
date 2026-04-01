'use client'

import { useState } from 'react'
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

export function CreateAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [accountStatus, setAccountStatus] = useState<'__none__' | 'at_risk' | 'warmup' | 'expansion'>('__none__')

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

      const res = await createCompany({
        name,
        website_url: websiteUrl || null,
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
        setName('')
        setWebsiteUrl('')
        setLogoUrl('')
        setIndustry('')
        setHeadquarters('')
        setEmployeeCount('')
        setDescription('')
        setAccountStatus('__none__')
        router.push(ROUTES.accountsDetail(res.id))
      } else {
        toast.error(res.error ?? 'Erstellen fehlgeschlagen.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. ACME GmbH"
              disabled={pending}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-website">Website</Label>
            <Input
              id="account-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="acme.com"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-logo">Logo-URL</Label>
            <Input
              id="account-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-industry">Branche</Label>
            <Input
              id="account-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="z. B. Manufacturing"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-hq">Ort</Label>
            <Input
              id="account-hq"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="z. B. München, DE"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-employee">Mitarbeiter</Label>
            <Input
              id="account-employee"
              inputMode="numeric"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              placeholder="z. B. 2500"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label>Account Status</Label>
            <Select
              value={accountStatus}
              onValueChange={(v) =>
                setAccountStatus(v as '__none__' | 'at_risk' | 'warmup' | 'expansion')
              }
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
            <Label htmlFor="account-description">Beschreibung</Label>
            <Textarea
              id="account-description"
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
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

