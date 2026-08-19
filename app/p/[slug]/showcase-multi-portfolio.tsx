'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { Lock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Option } from '@/components/ui/option'
import { Separator } from '@/components/ui/separator'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatReferenceDate, formatReferenceVolume } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { kpisForPublicReference, formatProjectStatusDe } from '@/lib/public-portfolio/kpis-for-reference'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
import { cn } from '@/lib/utils'
import type { PublicReference } from '../actions'
import { ShowcaseReferenceContent } from './showcase-reference-content'

const RELEASE_NOT_INCLUDED = 'In dieser Freigabe nicht enthalten'

const PUBLIC_PORTFOLIO_KPI_DETAIL_DEDUPE = new Set([
  'Projektvolumen',
  'Vertragsart',
  'Projektstatus',
  'Account-Größe',
])

function formatDateMaybe(value: string | null) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  const d = new Date(v.includes('T') ? v : `${v}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return v
  return formatReferenceDate(d.toISOString(), 'de-DE')
}

function splitTags(tags: string | null) {
  return String(tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function releaseText(value: string | null | undefined): string {
  const s = value != null ? String(value).trim() : ''
  return s || RELEASE_NOT_INCLUDED
}

function releaseVolume(volumeEur: string | null): string {
  return formatReferenceVolume(volumeEur) || RELEASE_NOT_INCLUDED
}

function releaseEmployees(n: number | null): string {
  if (n == null) return RELEASE_NOT_INCLUDED
  return n.toLocaleString('de-DE')
}

function releaseDisplay(value: string): ReactNode {
  if (value !== RELEASE_NOT_INCLUDED) return value
  return (
    <span
      title={RELEASE_NOT_INCLUDED}
      aria-label={RELEASE_NOT_INCLUDED}
      className="inline-flex items-center text-muted-foreground"
    >
      <Lock className="h-4 w-4" />
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function ShowcaseMultiPortfolio({
  references,
}: {
  references: PublicReference[]
}) {
  const [selectedId, setSelectedId] = useState(references[0]?.id ?? '')

  useEffect(() => {
    function applyHash() {
      const id = window.location.hash.replace(/^#/, '')
      if (id && references.some((r) => r.id === id)) setSelectedId(id)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [references])

  function select(id: string) {
    setSelectedId(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const selectedIndex = Math.max(
    0,
    references.findIndex((r) => r.id === selectedId),
  )
  const selected = references[selectedIndex] ?? references[0]
  const prev = references[selectedIndex - 1]
  const next = references[selectedIndex + 1]

  const kpisInDetails = useMemo(() => {
    if (!selected) return []
    return kpisForPublicReference(selected, { max: 3 }).filter(
      (k) => !PUBLIC_PORTFOLIO_KPI_DETAIL_DEDUPE.has(k.label),
    )
  }, [selected])

  if (!selected) return null

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,16.5rem)_minmax(0,1fr)]">
      <nav aria-label="Referenzen in diesem Portfolio" className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {references.length} Referenzen
        </p>
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {references.map((ref, index) => {
            const active = ref.id === selected.id
            return (
              <li key={ref.id} className="min-w-[14rem] lg:min-w-0">
                <Option data-selected={active ? 'true' : undefined} className="p-0">
                <button
                  type="button"
                  onClick={() => select(ref.id)}
                  className={cn(
                    'flex w-full items-start gap-3 p-3 text-left transition-colors',
                    !active && 'hover:bg-muted/40',
                  )}
                  aria-current={active ? 'true' : undefined}
                >
                  {ref.company_logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ref.company_logo_url}
                      alt=""
                      className="mt-0.5 h-9 w-9 rounded-md border bg-muted object-contain p-0.5"
                    />
                  ) : (
                    <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {ref.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {ref.company_name}
                    </span>
                  </span>
                </button>
                </Option>
              </li>
            )
          })}
        </ul>
      </nav>

      <Card className="p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {selectedIndex + 1} von {references.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!prev}
              onClick={() => prev && select(prev.id)}
              aria-label="Vorherige Referenz"
            >
              <AppIcon icon={ArrowLeft01Icon} size={16} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!next}
              onClick={() => next && select(next.id)}
              aria-label="Nächste Referenz"
            >
              <AppIcon icon={ArrowRight01Icon} size={16} />
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Referenz</Badge>
              </div>
              <div className="flex items-start gap-3">
                {selected.company_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.company_logo_url}
                    alt={`${selected.company_name} Logo`}
                    className="mt-0.5 h-10 w-10 rounded-md border bg-muted object-contain p-1"
                  />
                ) : null}
                <div className="min-w-0">
                  <CardTitle className="text-2xl tracking-tight">
                    {selected.title}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.company_name}
                    {selected.industry
                      ? ` · ${formatIndustryDisplay(selected.industry)}`
                      : ''}
                    {selected.country?.trim() ? ` · ${selected.country.trim()}` : ''}
                  </p>
                </div>
              </div>
              {splitTags(selected.tags).length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {splitTags(selected.tags).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <ShowcaseReferenceContent
              summary={selected.summary}
              challenge={selected.customer_challenge}
              solution={selected.our_solution}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8 lg:h-fit">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Projektdetails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DetailRow
                  label="Volumen"
                  value={releaseDisplay(releaseVolume(selected.volume_eur))}
                />
                <DetailRow
                  label="Vertragsart"
                  value={releaseDisplay(
                    releaseText(formatContractTypeDisplay(selected.contract_type)),
                  )}
                />
                <DetailRow
                  label="Projektstatus"
                  value={releaseDisplay(
                    releaseText(
                      formatProjectStatusDe(selected.project_status) ||
                        selected.project_status,
                    ),
                  )}
                />
                <DetailRow
                  label="Projektstart"
                  value={releaseDisplay(
                    formatDateMaybe(selected.project_start) || RELEASE_NOT_INCLUDED,
                  )}
                />
                <DetailRow
                  label="Projektende"
                  value={releaseDisplay(
                    String(selected.project_end ?? '').trim()
                      ? formatProjectEndWithDurationDe({
                          project_start: selected.project_start,
                          project_end: selected.project_end,
                          project_status: selected.project_status,
                          formatEndDate: (iso) => formatDateMaybe(iso) || '',
                        }) || RELEASE_NOT_INCLUDED
                      : formatDateMaybe(selected.project_end) || RELEASE_NOT_INCLUDED,
                  )}
                />
                <DetailRow
                  label="Website"
                  value={releaseDisplay(releaseText(selected.website))}
                />
                <DetailRow
                  label="Mitarbeiter"
                  value={releaseDisplay(releaseEmployees(selected.employee_count))}
                />

                {kpisInDetails.length ? (
                  <>
                    <Separator className="my-3" />
                    <div className="grid gap-2">
                      {kpisInDetails.map((kpi) => (
                        <Card
                          key={kpi.label}
                          className="border-border/70 bg-card shadow-none"
                        >
                          <CardHeader className="py-3 pb-1">
                            <CardTitle
                              as="h3"
                              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                            >
                              {kpi.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 pb-3">
                            <p className="text-base font-semibold tabular-nums text-foreground">
                              {kpi.value}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Card>
    </div>
  )
}
