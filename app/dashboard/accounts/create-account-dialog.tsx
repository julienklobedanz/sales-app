'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
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
  searchCompanySuggestions,
  type CompanySearchSuggestion,
} from '@/app/dashboard/evidence/new/actions'
import { cn } from '@/lib/utils'

function displayHostFromUrl(url: string | null | undefined): string {
  if (!url) return ''
  const u = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  return u.split('/')[0] ?? u
}

function normalizeWebsiteForSave(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t.replace(/^www\./i, '')}`
}

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
  const [accountStatus, setAccountStatus] = useState<'__none__' | 'at_risk' | 'warmup' | 'expansion'>('__none__')

  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CompanySearchSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const searchAbortRef = useRef(0)

  const resetForm = useCallback(() => {
    setName('')
    setWebsiteUrl('')
    setLogoUrl('')
    setIndustry('')
    setHeadquarters('')
    setEmployeeCount('')
    setDescription('')
    setAccountStatus('__none__')
    setSuggestions([])
    setDebouncedQuery('')
    setSuggestOpen(false)
    setSearchLoading(false)
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(name.trim()), 280)
    return () => window.clearTimeout(t)
  }, [name])

  useEffect(() => {
    if (!open || debouncedQuery.length < 2) {
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
    const fn = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false)
      }
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
      setEmployeeCount(res.employee_count != null ? String(res.employee_count) : '')
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
        employeeCount.trim().length > 0 ? Number(employeeCount.trim()) : null
      if (employeeCount.trim().length > 0 && Number.isNaN(employee as number)) {
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
        router.push(ROUTES.accountsDetail(res.id))
      } else {
        toast.error(res.error ?? 'Erstellen fehlgeschlagen.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && !enriching && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name">Name</Label>
            <div className="relative" ref={wrapRef}>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (e.target.value.trim().length >= 2) setSuggestOpen(true)
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestOpen(true)
                }}
                placeholder="z. B. ACME GmbH"
                disabled={pending || enriching}
                autoFocus
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={suggestOpen}
              />
              {suggestOpen && (searchLoading || suggestions.length > 0) ? (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
                >
                  {searchLoading && suggestions.length === 0 ? (
                    <li className="px-3 py-2 text-muted-foreground">{COPY.accounts.createDialogSearching}</li>
                  ) : null}
                  {suggestions.map((s) => (
                    <li key={s.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent hover:text-accent-foreground'
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
                          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                            ?
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {s.source === 'local'
                            ? COPY.accounts.createDialogSuggestLocal
                            : COPY.accounts.createDialogSuggestBrandfetch}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{COPY.accounts.createDialogNameHint}</p>
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
            <Input
              id="account-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="z. B. Manufacturing"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-hq">Ort</Label>
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
              onChange={(e) => setEmployeeCount(e.target.value)}
              placeholder="z. B. 2500"
              disabled={pending || enriching}
            />
          </div>

          <div className="grid gap-2">
            <Label>Account Status</Label>
            <Select
              value={accountStatus}
              onValueChange={(v) =>
                setAccountStatus(v as '__none__' | 'at_risk' | 'warmup' | 'expansion')
              }
              disabled={pending || enriching}
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
