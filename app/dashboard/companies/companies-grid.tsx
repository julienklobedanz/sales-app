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
import { Building2Icon, MapPinIcon, Search, X } from 'lucide-react'
import { deleteCompanyWithData } from './actions'

export type CompanyCard = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
}

export function CompaniesGrid({ companies }: { companies: CompanyCard[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, search])

  return (
    <div className="space-y-6">
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
              className="relative h-full overflow-hidden transition-shadow duration-200 hover:shadow-md hover:border-primary/20"
            >
              <button
                type="button"
                className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!window.confirm('Diesen Kunden und alle zugehörigen Daten wirklich löschen?')) return
                  const result = await deleteCompanyWithData(company.id)
                  if (!result.success && result.error) {
                    console.error(result.error)
                  }
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
                  <div className="flex items-start gap-3">
                    {company.logo_url ? (
                      <div className="relative size-12 shrink-0 rounded-md border bg-muted overflow-hidden">
                        <Image
                          src={company.logo_url}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                        <Building2Icon className="size-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{company.name}</CardTitle>
                      {company.industry && (
                        <CardDescription className="text-xs mt-0.5 truncate">
                          {company.industry}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {company.headquarters && (
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{company.headquarters}</span>
                    </div>
                  )}
                  {company.website_url && (
                    <span className="mt-1 block truncate text-primary hover:underline">
                      {company.website_url.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                    </span>
                  )}
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
