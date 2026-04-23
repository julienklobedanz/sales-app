import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleFavorite } from '@/app/dashboard/actions'
import { Eye, Mail, Pencil, StarIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { formatNumberDe } from '@/lib/format'
import { deleteReferenceFromDetailPage } from './actions'
import { ReferenceStatusBadge } from '@/components/reference-status-badge'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { PdfExportDialog } from './pdf-export-dialog'
import { ShareLinkButton } from './share-link-button'
import { RequestApprovalDialog } from './request-approval-dialog'
import { ReferenceViewedTracker } from './reference-viewed-tracker'
import { getReferenceUsageStats } from '@/app/dashboard/references/reference-usage-stats'

export const dynamic = 'force-dynamic'

function splitTags(tags: string | null) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function anonymizeText(value: string | null | undefined, companyName: string | null | undefined) {
  const text = String(value ?? '')
  const normalizedCompany = String(companyName ?? '').trim()
  if (!text) return text
  if (!normalizedCompany) return text
  const escaped = normalizedCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), 'Kunde')
}

export default async function EvidenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const qs = await searchParams

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)

  const role = (profile as { role?: 'admin' | 'sales' | 'account_manager' }).role ?? 'sales'

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      industry,
      country,
      status,
      contact_id,
      customer_contact_id,
      customer_approval_status,
      anonymized_from_id,
      tags,
      created_at,
      updated_at,
      customer_challenge,
      our_solution,
      volume_eur,
      contract_type,
      project_start,
      project_end,
      incumbent_provider,
      competitors,
      website,
      companies ( id, name )
    `
    )
    .eq('id', id)
    .single()

  if (error || !row) notFound()

  type CompanyRow = { id: string; name: string }
  type ReferenceDetailRow = {
    id: string
    title: string
    summary: string | null
    industry: string | null
    country: string | null
    status: string
    contact_id: string | null
    customer_contact_id: string | null
    customer_approval_status: string | null
    anonymized_from_id: string | null
    created_at: string | null
    updated_at: string | null
    tags: string | null
    customer_challenge: string | null
    our_solution: string | null
    customer_contact: string | null
    volume_eur: string | null
    contract_type: string | null
    project_start: string | null
    project_end: string | null
    incumbent_provider: string | null
    competitors: string | null
    website: string | null
    companies: CompanyRow | CompanyRow[] | null
  }

  const ref = row as unknown as ReferenceDetailRow

  const normalizedStatus = String(ref.status ?? '').toLowerCase()
  if (
    role === 'sales' &&
    !(
      normalizedStatus === 'approved' ||
      normalizedStatus === 'internal_only' ||
      normalizedStatus === 'anonymized' ||
      normalizedStatus === 'external' ||
      normalizedStatus === 'internal'
    )
  ) {
    notFound()
  }

  const { data: favorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('reference_id', id)
    .maybeSingle()

  const isFavorited = Boolean(favorite?.id)
  const usageStats = await getReferenceUsageStats(id)
  const ev = usageStats?.events ?? {}
  const n = (key: string) => ev[key] ?? 0
  const tags = splitTags(ref.tags ?? null)
  const company = Array.isArray(ref.companies) ? ref.companies[0] : ref.companies
  const isAnonymizedView = qs?.view === 'anonymized'
  const companyName = company?.name ?? null
  const headerCompany = isAnonymizedView ? 'Kunde' : companyName
  const industryLabel = anonymizeText(ref.industry ?? null, companyName)
  const summaryText = isAnonymizedView
    ? anonymizeText(ref.summary ?? null, companyName)
    : (ref.summary ?? null)
  const challengeText = isAnonymizedView
    ? anonymizeText(ref.customer_challenge ?? null, companyName)
    : (ref.customer_challenge ?? null)
  const solutionText = isAnonymizedView
    ? anonymizeText(ref.our_solution ?? null, companyName)
    : (ref.our_solution ?? null)
  const hasSummary = Boolean(summaryText?.trim())
  const hasChallenge = Boolean(challengeText?.trim())
  const hasSolution = Boolean(solutionText?.trim())

  const createdAt = ref.created_at ? new Date(ref.created_at) : null
  const updatedAt = ref.updated_at ? new Date(ref.updated_at) : null
  const activities = [
    ...(createdAt
      ? [
          {
            at: createdAt,
            title: 'Referenz erstellt',
            detail: `Die Referenz wurde in ${COPY.nav.evidence} angelegt.`,
          },
        ]
      : []),
    ...(updatedAt && createdAt && updatedAt.getTime() !== createdAt.getTime()
      ? [
          {
            at: updatedAt,
            title: 'Referenz bearbeitet',
            detail: 'Inhalte oder Metadaten wurden aktualisiert.',
          },
        ]
      : []),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10)

  return (
    <div>
      <ReferenceViewedTracker referenceId={id} />
      <div className="mb-6">
        <nav className="text-sm text-muted-foreground">
          <Link href={ROUTES.evidence.root} className="hover:underline">
            {COPY.nav.evidence}
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{ref.title}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ReferenceStatusBadge status={ref.status} />
              </div>
              <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} break-words`}>
                {ref.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {headerCompany ? `${headerCompany} · ` : ''}
                {industryLabel ?? ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.length ? (
                  tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {hasSummary || hasChallenge || hasSolution ? (
            <div className="space-y-4">
              {hasSummary ? (
                <div>
                  <div className="text-sm font-semibold">Zusammenfassung</div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {summaryText}
                  </p>
                </div>
              ) : null}
              {hasChallenge ? (
                <div>
                  <div className="text-sm font-semibold">Herausforderung</div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {challengeText}
                  </p>
                </div>
              ) : null}
              {hasSolution ? (
                <div>
                  <div className="text-sm font-semibold">Unsere Lösung</div>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                    {solutionText}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.length ? (
                <ol className="relative ml-2 border-l pl-6">
                  {activities.map((a) => (
                    <li key={`${a.title}-${a.at.toISOString()}`} className="pb-4 last:pb-0">
                      <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-muted ring-4 ring-background" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.at.toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{a.detail}</div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projektdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium truncate max-w-[220px]">{headerCompany ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Volumen</span>
                <span className="font-medium tabular-nums">
                  {ref.volume_eur != null && ref.volume_eur !== ''
                    ? formatNumberDe(ref.volume_eur)
                    : ''}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Vertragsart</span>
                <span className="font-medium">{ref.contract_type ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektstart</span>
                <span className="font-medium">{ref.project_start ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektende</span>
                <span className="font-medium">{ref.project_end ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Akt. Dienstleister</span>
                <span className="font-medium">{ref.incumbent_provider ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Wettbewerber</span>
                <span className="font-medium">{ref.competitors ?? ''}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nutzung & Impact</CardTitle>
              <p className="text-xs text-muted-foreground">
                Aus dem Audit-Log (evidence_events). Gilt für alle Rollen mit Zugriff auf diese
                Referenz.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Detail-Ansichten (App)</div>
                <div className="font-semibold tabular-nums">{n('reference_viewed')}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Öffentliche Link-Aufrufe</div>
                <div className="font-semibold tabular-nums">{n('share_link_viewed')}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">PDF-Exports</div>
                <div className="font-semibold tabular-nums">{n('reference_exported')}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Kundenlinks erstellt</div>
                <div className="font-semibold tabular-nums">{n('reference_shared')}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">In Suchergebnissen</div>
                <div className="font-semibold tabular-nums">{n('reference_matched')}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">„Hat geholfen“ (Deal)</div>
                <div className="font-semibold tabular-nums">{n('reference_helped')}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Deals verknüpft</div>
                <div className="font-semibold tabular-nums">{usageStats?.dealsLinked ?? 0}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">Deal-Ergebnisse</div>
                <div className="font-semibold tabular-nums">
                  {usageStats
                    ? `${usageStats.dealsWon} / ${usageStats.dealsLost} / ${usageStats.dealsWithdrawn}`
                    : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  Gewonnen / Verloren / Abgebrochen
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="outline" className="w-full gap-2">
                <Link href={isAnonymizedView ? ROUTES.evidence.detail(id) : `${ROUTES.evidence.detail(id)}?view=anonymized`}>
                  <span className="relative inline-flex items-center justify-center">
                    <AppIcon icon={Eye} size={16} />
                    {!isAnonymizedView ? (
                      <span className="absolute inset-0 -rotate-45 border-t border-current" />
                    ) : null}
                  </span>
                  {isAnonymizedView ? 'Vollversion anzeigen' : 'Anonymisierte Version anzeigen'}
                </Link>
              </Button>
              <form action={toggleFavorite.bind(null, id)}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full gap-2"
                >
                  <AppIcon
                    icon={StarIcon}
                    size={16}
                    className={
                      isFavorited
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-muted-foreground opacity-80'
                    }
                  />
                  {isFavorited ? 'Favorit' : 'Favorisieren'}
                </Button>
              </form>
              <PdfExportDialog referenceId={id} />
              <ShareLinkButton referenceId={id} />
              {role === 'sales' ? null : (
                <>
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link href={ROUTES.evidence.edit(id)}>
                      <AppIcon icon={Pencil} size={16} />
                      Bearbeiten
                    </Link>
                  </Button>
                  <RequestApprovalDialog
                    referenceId={id}
                    defaultContactId={ref.customer_contact_id ?? ref.contact_id}
                    triggerIcon={<AppIcon icon={Mail} size={16} />}
                  />
                  {role === 'admin' ? (
                    <form action={deleteReferenceFromDetailPage.bind(null, id)} className="w-full">
                      <Button type="submit" variant="destructive" className="w-full">
                        Löschen
                      </Button>
                    </form>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

