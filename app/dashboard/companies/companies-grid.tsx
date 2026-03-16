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
import { Badge } from '@/components/ui/badge'
import { Building2Icon, MapPinIcon, Globe2, Search, X, Loader2 } from 'lucide-react'
import { deleteCompanyWithData } from './actions'

export type CompanyCard = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  intelligence_score?: number | null
}

export function CompaniesGrid({ companies }: { companies: CompanyCard[] }) {
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CompanyCard | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, search])

  return (
    <div className="space-y-6 rounded-3xl bg-slate-50/50 p-4 md:p-6">
      <div className="w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Firma suchen …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-lg border bg-background shadow-sm"
            aria-label="Firmen durchsuchen"
          />
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
                href={`/dashboard/companies/${company.id}`}
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
                        <CardTitle className="truncate text-base font-semibold">
                          {company.name}
                        </CardTitle>
                        {company.industry && (
                          <CardDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                            {company.industry}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {typeof company.intelligence_score === 'number' && (
                      <Badge
                        variant="outline"
                        className="ml-2 shrink-0 rounded-full border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {company.intelligence_score}%
                      </Badge>
                    )}
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
                        <span className="truncate max-w-[160px] text-primary hover:underline">
                          {company.website_url
                            .replace(/^https?:\/\//i, '')
                            .replace(/\/$/, '')}
                        </span>
                      </div>
                    )}
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
              variant="destructive"
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
