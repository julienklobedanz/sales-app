'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { createCompany } from '@/app/dashboard/accounts/actions'
import { COPY } from '@/lib/copy'
import { normalizeWebsiteForSave } from '@/app/dashboard/accounts/account-company-helpers'

export function DealQuickAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string, name: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [industry, setIndustry] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setWebsiteUrl('')
    setIndustry('')
  }, [open])

  const canSubmit = name.trim().length > 0 && !pending

  const submit = async () => {
    if (!canSubmit) return
    setPending(true)
    try {
      const res = await createCompany({
        name: name.trim(),
        website_url: normalizeWebsiteForSave(websiteUrl),
        industry: industry.trim() || null,
      })
      if (res.success && res.id) {
        toast.success('Account erstellt.')
        onCreated(res.id, name.trim())
        onOpenChange(false)
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
          <DialogTitle>{COPY.accounts.quickCreateAccountTitle}</DialogTitle>
          <DialogDescription>{COPY.accounts.quickCreateAccountHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="quick-account-name">Name *</Label>
            <Input
              id="quick-account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. ACME GmbH"
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quick-account-website">Website</Label>
            <Input
              id="quick-account-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="acme.com"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quick-account-industry">Branche</Label>
            <Input
              id="quick-account-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="z. B. Automotive"
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {pending && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
            {COPY.accounts.quickCreateAccountSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
