'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Hinweis } from '@/components/ui/hinweis'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { createPartner } from './actions'
import { ROUTES } from '@/lib/routes'
import { COPY } from '@/lib/copy'
import {
  fetchCompanyEnrichment,
  type CompanySearchSuggestion,
} from '@/app/dashboard/references/new/actions'
import { displayHostFromUrl, normalizeWebsiteForSave } from './account-company-helpers'
import {
  PARTNER_CATEGORY_OPTIONS,
  type PartnerCategory,
} from '@/lib/accounts/account-entity'
import { resolveIndustryId } from '@/lib/constants/industries'
import { CompanyNameSuggestField } from './components/company-name-suggest-field'

export function CreatePartnerDialog({
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
  const [partnerCategory, setPartnerCategory] = useState<PartnerCategory>('sub')
  const [alsoCreateAccount, setAlsoCreateAccount] = useState(false)

  const [debouncedEnrichQuery, setDebouncedEnrichQuery] = useState('')
  const enrichReqRef = useRef(0)
  const lastAutoQueryRef = useRef('')

  const resetForm = useCallback(() => {
    setName('')
    setWebsiteUrl('')
    setLogoUrl('')
    setIndustry('')
    setHeadquarters('')
    setPartnerCategory('sub')
    setAlsoCreateAccount(false)
    setDebouncedEnrichQuery('')
    lastAutoQueryRef.current = ''
  }, [])

  useEffect(() => {
    if (!open) resetForm()
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
    void fetchCompanyEnrichment(query).then((enriched) => {
      if (reqId !== enrichReqRef.current) return
      setEnriching(false)
      if (!enriched.success) return
      lastAutoQueryRef.current = normalized
      setName(enriched.company_name?.trim() || query)
      setWebsiteUrl(displayHostFromUrl(enriched.website_url))
      setIndustry(resolveIndustryId(enriched.industry ?? ''))
      setHeadquarters(enriched.headquarters?.trim() || enriched.country?.trim() || '')
      setLogoUrl(enriched.logo_url ?? '')
    })
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
      const res = await createPartner({
        name,
        website_url: normalizeWebsiteForSave(websiteUrl),
        logo_url: logoUrl || null,
        industry: industry || null,
        headquarters: headquarters || null,
        partner_category: partnerCategory,
        alsoCreateAccount,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Erstellen fehlgeschlagen.')
        return
      }
      toast.success(
        alsoCreateAccount ? 'Partner und Account angelegt.' : 'Partner angelegt.',
      )
      onOpenChange(false)
      resetForm()
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && !enriching && onOpenChange(v)}>
      <DialogContent className="overflow-visible sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partner hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="partner-name">Name</Label>
            <CompanyNameSuggestField
              id="partner-name"
              value={name}
              onValueChange={setName}
              onSelectSuggestion={applySuggestion}
              disabled={pending}
              placeholder="z. B. Integrator AG"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {enriching
                ? 'Markendaten werden geladen …'
                : COPY.accounts.createDialogNameHint}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="partner-website">Website</Label>
            <Input
              id="partner-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="partner.com"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="partner-category">Kategorie</Label>
            <Select
              value={partnerCategory}
              onValueChange={(v) => setPartnerCategory(v as PartnerCategory)}
              disabled={pending || enriching}
            >
              <SelectTrigger id="partner-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTNER_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Hinweis className="flex items-start gap-2 p-3">
            <Checkbox
              id="partner-also-account"
              checked={alsoCreateAccount}
              onCheckedChange={(v) => setAlsoCreateAccount(v === true)}
              disabled={pending || enriching}
            />
            <div className="grid gap-0.5">
              <Label
                htmlFor="partner-also-account"
                className="cursor-pointer font-medium"
              >
                Partner ist auch Kunde (Account)
              </Label>
              <p className="text-xs text-muted-foreground">
                Legt zusätzlich einen Account mit denselben Stammdaten an und verknüpft
                beide Einträge.
              </p>
            </div>
          </Hinweis>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending || enriching}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {(pending || enriching) && (
              <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
            )}
            Partner anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
