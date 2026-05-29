'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  searchCompanySuggestions,
  type CompanySearchSuggestion,
} from '@/app/dashboard/evidence/new/actions'
import { cn } from '@/lib/utils'
import { displayHostFromUrl, normalizeWebsiteForSave } from './account-company-helpers'
import { PARTNER_CATEGORY_OPTIONS, type PartnerCategory } from '@/lib/accounts/company-entity'

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

  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [debouncedEnrichQuery, setDebouncedEnrichQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CompanySearchSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const searchAbortRef = useRef(0)
  const enrichReqRef = useRef(0)

  const resetForm = useCallback(() => {
    setName('')
    setWebsiteUrl('')
    setLogoUrl('')
    setIndustry('')
    setHeadquarters('')
    setPartnerCategory('sub')
    setAlsoCreateAccount(false)
    setSuggestions([])
    setDebouncedQuery('')
    setDebouncedEnrichQuery('')
    setSuggestOpen(false)
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    if (!open) resetForm()
  }, [open, resetForm])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(name.trim()), 280)
    return () => window.clearTimeout(t)
  }, [name])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedEnrichQuery(name.trim()), 2000)
    return () => window.clearTimeout(t)
  }, [name])

  useEffect(() => {
    if (!open || debouncedQuery.length < 1) {
      setSuggestions([])
      setSearchLoading(false)
      return
    }

    const id = ++searchAbortRef.current
    setSearchLoading(true)

    ;(async () => {
      const res = await searchCompanySuggestions(debouncedQuery)
      if (searchAbortRef.current !== id) return
      setSearchLoading(false)
      if (res.success) {
        setSuggestions(res.suggestions)
        setSuggestOpen(res.suggestions.length > 0)
      } else {
        setSuggestions([])
        setSuggestOpen(false)
      }
    })()
  }, [debouncedQuery, open])

  useEffect(() => {
    if (!open || debouncedEnrichQuery.length < 2) return
    const q = debouncedEnrichQuery
    const reqId = ++enrichReqRef.current

    ;(async () => {
      const res = await searchCompanySuggestions(q)
      if (enrichReqRef.current !== reqId) return
      const bf = res.success
        ? res.suggestions.find((s) => s.id.startsWith('brandfetch:'))
        : undefined
      if (!bf) return
      const domain = bf.id.slice('brandfetch:'.length)
      setEnriching(true)
      try {
        const enriched = await fetchCompanyEnrichment(domain)
        if (enrichReqRef.current !== reqId) return
        if (!enriched.success) return
        setName((prev) => (prev.trim() ? prev : enriched.company_name))
        setWebsiteUrl((prev) => prev || displayHostFromUrl(enriched.website_url))
        setIndustry((prev) => prev || enriched.industry || '')
        setHeadquarters(
          (prev) => prev || enriched.headquarters?.trim() || enriched.country?.trim() || ''
        )
        setLogoUrl((prev) => prev || enriched.logo_url || '')
      } finally {
        if (enrichReqRef.current === reqId) setEnriching(false)
      }
    })()
  }, [debouncedEnrichQuery, open])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const applySuggestion = async (s: CompanySearchSuggestion) => {
    setSuggestOpen(false)

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
      const res = await fetchCompanyEnrichment(domain)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setName(res.company_name)
      setWebsiteUrl(displayHostFromUrl(res.website_url))
      setIndustry(res.industry ?? '')
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
        alsoCreateAccount ? 'Partner und Account angelegt.' : 'Partner angelegt.'
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partner hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="partner-name">Name</Label>
            <div className="relative" ref={wrapRef}>
              <Input
                id="partner-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (e.target.value.trim().length >= 1) setSuggestOpen(true)
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestOpen(true)
                }}
                placeholder="z. B. Integrator AG"
                disabled={pending || enriching}
                autoFocus
                autoComplete="off"
              />
              {suggestOpen && (searchLoading || suggestions.length > 0) ? (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
                >
                  {searchLoading && suggestions.length === 0 ? (
                    <li className="px-3 py-2 text-muted-foreground">
                      {COPY.accounts.createDialogSearching}
                    </li>
                  ) : null}
                  {suggestions.map((s) => (
                    <li key={s.id} role="option">
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent'
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          void applySuggestion(s)
                        }}
                      >
                        {s.logo_url ? (
                          <Image
                            src={s.logo_url}
                            alt=""
                            width={24}
                            height={24}
                            unoptimized
                            className="size-6 shrink-0 rounded object-contain"
                          />
                        ) : (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px]">
                            ?
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{COPY.accounts.createDialogNameHint}</p>
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

          <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-muted/20 p-3">
            <Checkbox
              id="partner-also-account"
              checked={alsoCreateAccount}
              onCheckedChange={(v) => setAlsoCreateAccount(v === true)}
              disabled={pending || enriching}
            />
            <div className="grid gap-0.5">
              <Label htmlFor="partner-also-account" className="cursor-pointer font-medium">
                Partner ist auch Kunde (Account)
              </Label>
              <p className="text-xs text-muted-foreground">
                Legt zusätzlich einen Account mit denselben Stammdaten an und verknüpft beide Einträge.
              </p>
            </div>
          </div>
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
