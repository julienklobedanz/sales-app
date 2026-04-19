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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Building2,
  Briefcase,
  Globe,
  Loader,
  MapPinIcon,
  Plus,
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
              size="toolbar"
              className="shrink-0"
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              aria-label={favoritesOnly ? 'Favoritenfilter deaktivieren' : 'Nur Favoriten anzeigen'}
            >
              Nur Favoriten
            </Button>
            {canManage && (
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <ContextMenu key={company.id}>
              <ContextMenuTrigger asChild>
                <Card className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
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
                  </Link>
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
