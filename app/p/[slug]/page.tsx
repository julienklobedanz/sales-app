import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  getPublicPortfolio,
  getPublicPortfolioBranding,
  getPublicPortfolioShareOwner,
  incrementPortfolioViews,
} from '../actions'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
import { kpisForPublicReference, formatProjectStatusDe } from '@/lib/public-portfolio/kpis-for-reference'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShareOwnerContactCard } from './share-owner-contact-card'
import { PortfolioUnlockGate } from './portfolio-unlock-gate'
import { PublicPortfolioFooter } from './public-portfolio-footer'
import { ShowcaseSingleReference } from './showcase-single-reference'
import { resolveApprovalEditUrlForManageView } from '@/lib/references/resolve-approval-edit-url-for-manage'
import { Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
}

const RELEASE_NOT_INCLUDED = 'In dieser Freigabe nicht enthalten'

function formatDateMaybe(value: string | null) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  const d = new Date(v.includes('T') ? v : `${v}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return v
  return formatDateUtcDe(d.toISOString())
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

/** KPI-Labels, die bereits als Zeile in „Projektdetails“ vorkommen — keine zweite Kachel. */
const PUBLIC_PORTFOLIO_KPI_DETAIL_DEDUPE = new Set([
  'Projektvolumen',
  'Vertragsart',
  'Projektstatus',
  'Account-Größe',
])

function buildHeaderSubtitle(
  workspaceName: string,
  singleTitle: string | null,
  country: string | null
) {
  const countryPart = country?.trim() ? ` - (${country.trim()})` : ''
  if (singleTitle) {
    return `Projektdetails ${workspaceName} - ${singleTitle}${countryPart}`
  }
  return `Projektdetails ${workspaceName}${countryPart}`
}

export default async function PublicPortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const manageRaw = sp.manage
  const manageToken =
    typeof manageRaw === 'string' && manageRaw.length > 0 ? manageRaw : null
  const modeRaw = sp.mode
  const revokeMode = typeof modeRaw === 'string' && modeRaw === 'revoke'
  const result = await getPublicPortfolio(slug, manageToken)
  const branding = await getPublicPortfolioBranding(slug)
  const shareOwner = await getPublicPortfolioShareOwner(slug)
  const workspaceName = branding.found ? branding.name : 'RefStack Workspace'
  const singleReferenceTitle =
    result.found && result.references.length === 1 ? result.references[0]?.title ?? null : null
  let headerCountry: string | null = null
  if (result.found && result.references.length === 1) {
    const c = String(result.references[0]?.country ?? '').trim()
    headerCountry = c || null
  }
  const headerSubtitle = buildHeaderSubtitle(workspaceName, singleReferenceTitle, headerCountry)

  if (!result.found) {
    if (result.reason === 'locked') {
      return <PortfolioUnlockGate slug={slug} />
    }
    if (result.reason === 'expired') {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
          <div className="mx-auto max-w-md rounded-2xl border bg-card/80 p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-foreground">Link abgelaufen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Die Gültigkeitsdauer dieses Kundenlinks ist abgelaufen. Bitte den RefStack-Nutzer um einen neuen Link.
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="mx-auto max-w-md rounded-2xl border bg-card/80 p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Link nicht verfügbar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Link wurde deaktiviert oder existiert nicht.
          </p>
        </div>
      </div>
    )
  }

  await incrementPortfolioViews(slug)

  if (result.references.length === 1 && branding.found) {
    const singleRef = result.references[0]!
    const approvalEditUrl =
      revokeMode && result.canDeactivate && manageToken
        ? await resolveApprovalEditUrlForManageView(slug, manageToken, singleRef.id)
        : null

    return (
      <ShowcaseSingleReference
        slug={slug}
        reference={singleRef}
        branding={{
          name: branding.name,
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
        }}
        workspaceName={workspaceName}
        shareOwnerName={shareOwner.found ? shareOwner.name : 'RefStack Team'}
        shareOwnerPosition={shareOwner.found ? shareOwner.position : 'Sales Ansprechpartner'}
        shareOwnerAvatar={shareOwner.found ? shareOwner.avatar_url : null}
        shareOwnerEmail={shareOwner.found ? shareOwner.email : null}
        shareOwnerPhone={shareOwner.found ? shareOwner.phone : null}
        shareOwnerBookingUrl={shareOwner.found ? shareOwner.booking_url : null}
        canDeactivate={result.canDeactivate}
        revokeMode={revokeMode}
        approvalEditUrl={approvalEditUrl}
        showApprovalEdit={Boolean(approvalEditUrl)}
      />
    )
  }

  const shareOwnerName = shareOwner.found ? shareOwner.name : 'RefStack Team'
  const shareOwnerPosition = shareOwner.found ? shareOwner.position : 'Sales Ansprechpartner'
  const shareOwnerAvatar = shareOwner.found ? shareOwner.avatar_url : null
  const shareOwnerEmail = shareOwner.found ? shareOwner.email : null
  const shareOwnerPhone = shareOwner.found ? shareOwner.phone : null
  const shareOwnerBookingUrl = shareOwner.found ? shareOwner.booking_url : null

  return (
    <div className="min-h-screen bg-muted/20">
      {branding.found ? (
        <header className="border-b bg-background/95 px-6 py-5 sm:px-12 lg:px-16">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <h1
                className="text-lg font-semibold tracking-tight"
                style={{ color: branding.primary_color }}
              >
                {`Referenzportfolio - ${workspaceName}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>
            <div className="w-[280px] max-w-full">
              <ShareOwnerContactCard
                name={shareOwnerName}
                position={shareOwnerPosition}
                avatarUrl={shareOwnerAvatar}
                email={shareOwnerEmail}
                phone={shareOwnerPhone}
              />
            </div>
          </div>
        </header>
      ) : null}
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-8">
            {result.references.map((ref) => {
              const kpis = kpisForPublicReference(ref, { max: 3 })
              const kpisInDetails = kpis.filter((k) => !PUBLIC_PORTFOLIO_KPI_DETAIL_DEDUPE.has(k.label))
              const quoteApproved = ref.approval_quote_approved?.trim()
              const quoteGiver = ref.approval_reference_giver_name?.trim()
              return (
                <article key={ref.id} className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
                  <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Referenz</Badge>
                        </div>
                        <div className="flex items-start gap-3">
                          {ref.company_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ref.company_logo_url}
                              alt={`${ref.company_name} Logo`}
                              className="mt-0.5 h-10 w-10 rounded-md border bg-muted object-contain p-1"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                              {ref.title}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {ref.company_name}
                              {ref.industry ? ` · ${ref.industry}` : ''}
                              {ref.country?.trim() ? ` · ${ref.country.trim()}` : ''}
                            </p>
                          </div>
                        </div>
                        {splitTags(ref.tags).length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {splitTags(ref.tags).map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {quoteApproved || quoteGiver ? (
                        <Card className="border-border/70">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">
                              Stimme zur Zusammenarbeit
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {quoteApproved ? (
                              <p className="leading-relaxed italic text-foreground/90">
                                „{quoteApproved}“
                              </p>
                            ) : null}
                            {quoteGiver ? (
                              <p className="mt-2 text-xs font-medium text-foreground">{quoteGiver}</p>
                            ) : null}
                          </CardContent>
                        </Card>
                      ) : null}

                      {ref.customer_challenge || ref.our_solution ? (
                        <div className="flex w-full flex-col gap-4">
                          {ref.customer_challenge ? (
                            <Card className="border-border/70 flex min-h-[12rem] flex-col sm:min-h-[14rem]">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold">Herausforderung</CardTitle>
                              </CardHeader>
                              <CardContent className="flex flex-1 flex-col">
                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                  {ref.customer_challenge}
                                </p>
                              </CardContent>
                            </Card>
                          ) : null}

                          {ref.our_solution ? (
                            <Card className="border-border/70 flex min-h-[12rem] flex-col sm:min-h-[14rem]">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold">Unsere Lösung</CardTitle>
                              </CardHeader>
                              <CardContent className="flex flex-1 flex-col">
                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                  {ref.our_solution}
                                </p>
                              </CardContent>
                            </Card>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-8 lg:h-fit">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Projektdetails</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Volumen</span>
                            <span className="text-right font-medium tabular-nums">
                              {releaseDisplay(releaseVolume(ref.volume_eur))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Vertragsart</span>
                            <span className="text-right font-medium">
                              {releaseDisplay(releaseText(formatContractTypeDisplay(ref.contract_type)))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Projektstatus</span>
                            <span className="text-right font-medium">
                              {releaseDisplay(
                                releaseText(formatProjectStatusDe(ref.project_status) || ref.project_status)
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Projektstart</span>
                            <span className="text-right font-medium">
                              {releaseDisplay(formatDateMaybe(ref.project_start) || RELEASE_NOT_INCLUDED)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Projektende</span>
                            <span className="text-right font-medium">
                              {releaseDisplay(
                                String(ref.project_end ?? '').trim()
                                  ? formatProjectEndWithDurationDe({
                                      project_start: ref.project_start,
                                      project_end: ref.project_end,
                                      project_status: ref.project_status,
                                      formatEndDate: (iso) => formatDateMaybe(iso) || '',
                                    }) || RELEASE_NOT_INCLUDED
                                  : formatDateMaybe(ref.project_end) || RELEASE_NOT_INCLUDED
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Akt. Dienstleister</span>
                            <span className="text-right font-medium">
                              {releaseDisplay(releaseText(ref.incumbent_provider))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Wettbewerber</span>
                            <span className="text-right font-medium">
                              {releaseDisplay(releaseText(ref.competitors))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Website</span>
                            <span className="text-right font-medium break-all">
                              {releaseDisplay(releaseText(ref.website))}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Mitarbeiter</span>
                            <span className="text-right font-medium tabular-nums">
                              {releaseDisplay(releaseEmployees(ref.employee_count))}
                            </span>
                          </div>

                          {kpisInDetails.length ? (
                            <>
                              <Separator className="my-3" />
                              <div className="grid gap-2">
                                {kpisInDetails.map((kpi) => (
                                  <Card
                                    key={kpi.label}
                                    className="border-border/70 bg-muted/20 shadow-none"
                                  >
                                    <CardHeader className="py-3 pb-1">
                                      <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
                </article>
              )
            })}
            {result.references.length === 0 ? (
              <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
                Für diesen Link sind aktuell keine Referenzen sichtbar.
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <PublicPortfolioFooter
        slug={slug}
        workspaceName={workspaceName}
        shareOwnerEmail={shareOwnerEmail}
        bookingUrl={shareOwnerBookingUrl}
        canDeactivate={result.canDeactivate}
      />
    </div>
  )
}
