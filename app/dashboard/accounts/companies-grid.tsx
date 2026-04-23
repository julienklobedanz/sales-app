'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Building2,
  Briefcase,
  Globe,
  Loader,
  MapPinIcon,
  Plus,
  RefreshCw,
  StarIcon,
  Users,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { deleteCompanyWithData, refreshAccountsFromBrandfetch, toggleCompanyFavorite } from './actions'
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
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CompanyCard | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshingAccounts, setRefreshingAccounts] = useState(false)
  const [refreshPopoverOpen, setRefreshPopoverOpen] = useState(false)
  const [refreshResultTab, setRefreshResultTab] = useState<'updated' | 'skipped' | 'failed'>('updated')
  const [refreshSummary, setRefreshSummary] = useState<{
    updatedCount: number
    skippedCount: number
    failedCount: number
    updatedNames: string[]
    skippedNames: string[]
    failedNames: string[]
  } | null>(null)
  const { isAdmin, isAccountManager } = useRole()
  const canManage = isAdmin || isAccountManager

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

  return (
    <div className="space-y-5 rounded-3xl bg-muted/10 p-4 md:p-6">
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
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="toolbar"
              className="shrink-0 px-2.5 hover:bg-muted/70"
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              aria-label={favoritesOnly ? 'Favoritenfilter deaktivieren' : 'Nur Favoriten anzeigen'}
            >
              <AppIcon
                icon={StarIcon}
                size={16}
                className={
                  favoritesOnly
                    ? 'text-amber-500 dark:text-amber-400 [&_path]:fill-current'
                    : 'text-muted-foreground'
                }
              />
            </Button>
            {canManage && (
              <>
                <Popover open={refreshPopoverOpen} onOpenChange={setRefreshPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="toolbar"
                      className="shrink-0 px-2.5 hover:bg-muted/70"
                      disabled={refreshingAccounts}
                      onClick={async () => {
                        setRefreshingAccounts(true)
                        try {
                          const result = await refreshAccountsFromBrandfetch()
                          if (!result.success) {
                            toast.error(result.error ?? 'Account-Refresh fehlgeschlagen.')
                            return
                          }
                          setRefreshSummary({
                            updatedCount: result.updatedCount,
                            skippedCount: result.skippedCount,
                            failedCount: result.failedCount,
                            updatedNames: result.updatedNames,
                            skippedNames: result.skippedNames,
                            failedNames: result.failedNames,
                          })
                          if (result.failedCount > 0) setRefreshResultTab('failed')
                          else if (result.updatedCount > 0) setRefreshResultTab('updated')
                          else setRefreshResultTab('skipped')
                          setRefreshPopoverOpen(true)
                          toast.success(
                            `${result.updatedCount} Accounts aktualisiert (${result.skippedCount} übersprungen, ${result.failedCount} fehlgeschlagen).`
                          )
                          router.refresh()
                        } finally {
                          setRefreshingAccounts(false)
                        }
                      }}
                      aria-label="Accounts via Brandfetch aktualisieren"
                      title="Accounts via Brandfetch aktualisieren"
                    >
                      <AppIcon
                        icon={refreshingAccounts ? Loader : RefreshCw}
                        size={16}
                        className={refreshingAccounts ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'}
                      />
                    </Button>
                  </PopoverTrigger>
                  {refreshSummary ? (
                    <PopoverContent align="end" className="w-[min(420px,calc(100vw-2rem))] space-y-3 p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Refresh-Ergebnis</p>
                        <p className="text-xs text-muted-foreground">
                          Brandfetch-Abgleich für bestehende Accounts.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={refreshResultTab === 'updated' ? 'secondary' : 'ghost'}
                          className="h-7 px-2 text-xs"
                          onClick={() => setRefreshResultTab('updated')}
                        >
                          Aktualisiert ({refreshSummary.updatedCount})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={refreshResultTab === 'skipped' ? 'secondary' : 'ghost'}
                          className="h-7 px-2 text-xs"
                          onClick={() => setRefreshResultTab('skipped')}
                        >
                          Übersprungen ({refreshSummary.skippedCount})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={refreshResultTab === 'failed' ? 'secondary' : 'ghost'}
                          className="h-7 px-2 text-xs"
                          onClick={() => setRefreshResultTab('failed')}
                        >
                          Fehlgeschlagen ({refreshSummary.failedCount})
                        </Button>
                      </div>
                      <div className="max-h-[45vh] overflow-auto rounded-md border border-border/60 bg-muted/15">
                        {(refreshResultTab === 'updated'
                          ? refreshSummary.updatedNames
                          : refreshResultTab === 'skipped'
                            ? refreshSummary.skippedNames
                            : refreshSummary.failedNames
                        ).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Keine Einträge in dieser Kategorie.</p>
                        ) : (
                          <ul className="divide-y divide-border/50">
                            {(refreshResultTab === 'updated'
                              ? refreshSummary.updatedNames
                              : refreshResultTab === 'skipped'
                                ? refreshSummary.skippedNames
                                : refreshSummary.failedNames
                            ).map((name) => (
                              <li key={`${refreshResultTab}-${name}`} className="px-3 py-2 text-xs text-foreground">
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </PopoverContent>
                  ) : null}
                </Popover>
                <Button
                  type="button"
                  size="toolbar"
                  className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
                  onClick={() => setCreateOpen(true)}
                >
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <ContextMenu key={company.id}>
              <ContextMenuTrigger asChild>
                <Card className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
                  <div
                    role="link"
                    tabIndex={0}
                    className="block h-full cursor-pointer transition-opacity duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => router.push(ROUTES.accountsDetail(company.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(ROUTES.accountsDetail(company.id))
                      }
                    }}
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
                            <div className="flex items-center gap-2.5">
                              <CardTitle className="truncate text-base font-semibold">
                                {company.name}
                              </CardTitle>
                            </div>
                            {company.industry && (
                              <CardDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                                {company.industry}
                              </CardDescription>
                            )}
                          </div>
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
                              onClick={(e) => e.stopPropagation()}
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
                  </div>
                </Card>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-56">
                <ContextMenuItem asChild>
                  <Link href={ROUTES.accountsDetail(company.id)}>Öffnen</Link>
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    const next = !company.is_favorite
                    toggleCompanyFavorite(company.id, next).then((res) => {
                      if (!res.success) {
                        toast.error(res.error ?? 'Favorit konnte nicht gespeichert werden.')
                      }
                    })
                  }}
                >
                  {company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                </ContextMenuItem>

                {canManage ? (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem asChild>
                      <Link href={`${ROUTES.accountsDetail(company.id)}?edit=1`}>Bearbeiten</Link>
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        e.preventDefault()
                        if (deleting) return
                        setDeleteTarget(company)
                      }}
                    >
                      Löschen
                    </ContextMenuItem>
                  </>
                ) : null}
              </ContextMenuContent>
            </ContextMenu>
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
