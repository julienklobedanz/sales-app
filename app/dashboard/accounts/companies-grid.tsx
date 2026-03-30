'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Building2Icon, MapPinIcon, Globe2, Search, X, Loader2, Plus, Star, Briefcase, Users } from 'lucide-react'
import { deleteCompanyWithData, toggleCompanyFavorite } from './actions'
import { useRole } from '@/hooks/useRole'
import { CreateAccountDialog } from './create-account-dialog'

export type CompanyCard = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  is_favorite?: boolean | null
  open_deals_count?: number | null
  contacts_count?: number | null
  reference_count?: number | null
  stakeholder_count?: number | null
  strategy_filled?: boolean | null
}

export function CompaniesGrid({ companies }: { companies: CompanyCard[] }) {
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CompanyCard | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const { isAdmin, isAccountManager } = useRole()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = companies
    if (favoritesOnly) {
      list = list.filter((c) => c.is_favorite)
    }
    if (!q) return list
    return list.filter((c) => {
      const name = (c.name ?? '').toLowerCase()
      const industry = (c.industry ?? '').toLowerCase()
      return name.includes(q) || industry.includes(q)
    })
  }, [companies, search, favoritesOnly])

  const calculateAccountScore = (company: CompanyCard): number => {
    let score = 0
    const referenceCount = company.reference_count ?? 0
    const dealCount = company.open_deals_count ?? 0
    const strategyFilled = Boolean(company.strategy_filled)
    const stakeholderCount = company.stakeholder_count ?? 0
    score += Math.min(referenceCount * 10, 40)
    score += Math.min(dealCount * 10, 30)
    score += strategyFilled ? 20 : 0
    score += stakeholderCount > 0 ? 10 : 0
    return score
  }

  return (
    <div className="space-y-6 rounded-3xl bg-slate-50/50 p-4 md:p-6">
      <div className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Firma suchen …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-lg border bg-background pl-10 pr-4 shadow-sm"
              aria-label="Firmen durchsuchen"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={favoritesOnly ? 'default' : 'outline'}
              size="icon"
              className={`h-9 w-9 shrink-0 rounded-full ${favoritesOnly ? 'bg-yellow-500 text-black hover:bg-yellow-500/90' : ''}`}
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-label={favoritesOnly ? 'Alle Accounts anzeigen' : 'Nur Favoriten anzeigen'}
            >
              <Star
                className={`h-4 w-4 ${favoritesOnly ? 'fill-yellow-400 text-yellow-700' : 'text-slate-400'}`}
              />
            </Button>
            {(isAdmin || isAccountManager) && (
              <>
                <Button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Account hinzufügen</span>
                </Button>
                <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />
              </>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {companies.length === 0
            ? 'Noch keine Firmen angelegt.'
            : 'Keine Firma unter diesem Namen gefunden.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <Card
              key={company.id}
              className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md"
            >
              <button
                type="button"
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/60 transition-opacity duration-150 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (deleting) return
                  setDeleteTarget(company)
                }}
                aria-label="Kunde löschen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/dashboard/accounts/${company.id}`}
                className="block h-full transition-opacity duration-300 ease-out"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {company.logo_url ? (
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border bg-muted">
                          <Image
                            src={company.logo_url}
                            alt=""
                            fill
                            className="object-contain"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-muted">
                          <Building2Icon className="size-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="truncate text-base font-semibold">
                          {company.name}
                        </CardTitle>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-yellow-500"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const next = !company.is_favorite
                            void toggleCompanyFavorite(company.id, next)
                          }}
                          aria-label={company.is_favorite ? 'Als Favorit entfernen' : 'Als Favorit markieren'}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              company.is_favorite
                                ? 'fill-yellow-400 text-yellow-500'
                                : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </div>
                        {company.industry && (
                          <CardDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                            {company.industry}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="ml-2 shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold text-primary font-mono">
                      {calculateAccountScore(company)}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-1 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-3">
                    {company.headquarters && (
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="size-3.5 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {company.headquarters}
                        </span>
                      </div>
                    )}
                    {company.website_url && (
                      <div className="flex items-center gap-1.5">
                        <Globe2 className="size-3.5 shrink-0" />
                        <a
                          href={
                            company.website_url.startsWith('http')
                              ? company.website_url
                              : `https://${company.website_url}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="truncate max-w-[160px] text-muted-foreground hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardContent className="pt-2 pb-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-3.5" />
                      <span>
                        {company.open_deals_count ?? 0} Deals
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      <span>
                        {company.reference_count ?? 0} Referenzen
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bist du dir absolut sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Dies wird den Kunden und alle damit verbundenen Deals,
              Strategien und Kontakte dauerhaft löschen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => {
                if (!deleting) setDeleteTarget(null)
              }}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !deleteTarget}
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  setDeleting(true)
                  const result = await deleteCompanyWithData(deleteTarget.id)
                  if (!result.success && result.error) {
                    console.error(result.error)
                  }
                  setDeleteTarget(null)
                } finally {
                  setDeleting(false)
                }
              }}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
