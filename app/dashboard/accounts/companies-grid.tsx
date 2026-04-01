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
import { ToolbarSearchField } from '@/components/ui/toolbar-search-field'
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
import {
  Building2,
  Briefcase,
  Cancel01Icon,
  Globe,
  Loader,
  MapPinIcon,
  Plus,
  StarIcon,
  Users,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { deleteCompanyWithData, toggleCompanyFavorite } from './actions'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { useRole } from '@/hooks/useRole'
import { CreateAccountDialog } from './create-account-dialog'
import { toast } from 'sonner'

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
    <div className="space-y-6 rounded-3xl bg-muted/20 p-4 md:p-6">
      <div className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchField
            variant="dashboard"
            wrapperClassName="flex-1"
            type="search"
            placeholder={COPY.accounts.searchCompaniesPlaceholder}
            value={search}
            onChange={setSearch}
            aria-label="Firmen durchsuchen"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={favoritesOnly ? 'default' : 'outline'}
              size="icon"
              className={`h-9 w-9 shrink-0 rounded-full ${favoritesOnly ? 'bg-accent text-accent-foreground hover:bg-accent/80' : ''}`}
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-label={favoritesOnly ? COPY.accounts.ariaFavoritesOnlyOff : COPY.accounts.ariaFavoritesOnlyOn}
            >
              <AppIcon
                icon={StarIcon}
                size={16}
                className={favoritesOnly ? 'text-primary' : 'text-muted-foreground'}
              />
            </Button>
            {(isAdmin || isAccountManager) && (
              <>
                <Button type="button" size="toolbar" onClick={() => setCreateOpen(true)}>
                  <AppIcon icon={Plus} size={16} />
                  {COPY.accounts.addAccount}
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
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/60 transition-opacity duration-150 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (deleting) return
                  setDeleteTarget(company)
                }}
                aria-label="Kunde löschen"
              >
                <AppIcon icon={Cancel01Icon} size={14} />
              </button>
              <Link
                href={ROUTES.accountsDetail(company.id)}
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
                          <AppIcon icon={Building2} size={24} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="truncate text-base font-semibold">
                          {company.name}
                        </CardTitle>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const next = !company.is_favorite
                            toggleCompanyFavorite(company.id, next).then((res) => {
                              if (!res.success) {
                                toast.error(res.error ?? 'Favorit konnte nicht gespeichert werden.')
                              }
                            })
                          }}
                          aria-label={company.is_favorite ? 'Als Favorit entfernen' : 'Als Favorit markieren'}
                        >
                          <AppIcon
                            icon={StarIcon}
                            size={16}
                            className={company.is_favorite ? 'text-primary' : 'text-muted-foreground'}
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
                        <AppIcon icon={MapPinIcon} size={14} className="shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {company.headquarters}
                        </span>
                      </div>
                    )}
                    {company.website_url && (
                      <div className="flex items-center gap-1.5">
                        <AppIcon icon={Globe} size={14} className="shrink-0" />
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
                      <AppIcon icon={Briefcase} size={14} />
                      <span>
                        {company.open_deals_count ?? 0} Deals
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AppIcon icon={Users} size={14} />
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
              {deleting && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
