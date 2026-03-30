'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { createCompany } from './actions'

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
  const [industry, setIndustry] = useState('')
  const [headquarters, setHeadquarters] = useState('')

  const canSubmit = name.trim().length > 0 && !pending

  const submit = async () => {
    if (!canSubmit) return
    setPending(true)
    try {
      const res = await createCompany({
        name,
        website_url: websiteUrl || null,
        industry: industry || null,
        headquarters: headquarters || null,
      })
      if (res.success && res.id) {
        toast.success('Account erstellt.')
        onOpenChange(false)
        setName('')
        setWebsiteUrl('')
        setIndustry('')
        setHeadquarters('')
        router.push(`/dashboard/accounts/${res.id}`)
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
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

