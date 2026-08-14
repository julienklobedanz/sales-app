import type { Metadata } from 'next'
import {
  getPublicPortfolio,
  getPublicPortfolioBranding,
  getPublicPortfolioManageInsights,
  getPublicPortfolioShareOwner,
  incrementPortfolioViews,
  resolvePublicPortfolioRecipient,
} from '../actions'
import { ShareOwnerContactCard } from './share-owner-contact-card'
import { PortfolioUnlockGate } from './portfolio-unlock-gate'
import { PortfolioEmailUnlockGate } from './portfolio-email-unlock-gate'
import { PortfolioSessionTracker } from './portfolio-session-tracker'
import { PublicPortfolioFooter } from './public-portfolio-footer'
import { ShowcaseSingleReference } from './showcase-single-reference'
import { ShowcaseMultiPortfolio } from './showcase-multi-portfolio'
import {
  formatManageApprovedSinceLabel,
  formatManageLastViewLabel,
  formatManageLinkExpiresLabel,
  type ManageApprovalStatusSummary,
  type ManageInsightSummary,
} from './showcase-manage-insight-bar'
import { resolveApprovalEditUrlForManageView } from '@/lib/references/resolve-approval-edit-url-for-manage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
}

function buildHeaderSubtitle(
  workspaceName: string,
  singleTitle: string | null,
  country: string | null,
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
  const recipientRaw = sp.r
  const recipientToken =
    typeof recipientRaw === 'string' && recipientRaw.length > 0 ? recipientRaw : null
  const result = await getPublicPortfolio(slug, manageToken)
  const recipientInfo = await resolvePublicPortfolioRecipient(slug, recipientToken)
  const branding = await getPublicPortfolioBranding(slug)
  const shareOwner = await getPublicPortfolioShareOwner(slug)
  const workspaceName = branding.found ? branding.name : 'RefStack Workspace'
  const singleReferenceTitle =
    result.found && result.references.length === 1
      ? (result.references[0]?.title ?? null)
      : null
  let headerCountry: string | null = null
  if (result.found && result.references.length === 1) {
    const c = String(result.references[0]?.country ?? '').trim()
    headerCountry = c || null
  }
  const headerSubtitle = buildHeaderSubtitle(
    workspaceName,
    singleReferenceTitle,
    headerCountry,
  )

  if (!result.found) {
    if (result.reason === 'locked') {
      if (result.gateMode === 'email') {
        return <PortfolioEmailUnlockGate slug={slug} />
      }
      return <PortfolioUnlockGate slug={slug} />
    }
    if (result.reason === 'expired') {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
          <div className="mx-auto max-w-md rounded-2xl border bg-card/80 p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-foreground">Link abgelaufen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Die Gültigkeitsdauer dieses Kundenlinks ist abgelaufen. Bitte den
              RefStack-Nutzer um einen neuen Link.
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

  const isManageRevokeView = Boolean(revokeMode && manageToken)

  if (!isManageRevokeView) {
    await incrementPortfolioViews(slug)
  }

  const buyerLogoUrl =
    recipientInfo.found && recipientInfo.companyLogoUrl
      ? recipientInfo.companyLogoUrl
      : null
  const buyerCompanyName =
    recipientInfo.found && recipientInfo.companyName ? recipientInfo.companyName : null
  const sessionTracker = isManageRevokeView ? null : (
    <PortfolioSessionTracker slug={slug} recipientToken={recipientToken} />
  )

  if (result.references.length === 1 && branding.found) {
    const singleRef = result.references[0]!
    const approvalTokenFromPortfolio =
      typeof singleRef.approval_token === 'string' ? singleRef.approval_token.trim() : ''
    const approvalEditUrl =
      revokeMode && result.canDeactivate && manageToken
        ? approvalTokenFromPortfolio
          ? `/approval/${approvalTokenFromPortfolio}`
          : await resolveApprovalEditUrlForManageView(slug, manageToken, singleRef.id)
        : null

    let manageInsights: ManageInsightSummary | null = null
    let manageApprovalStatus: ManageApprovalStatusSummary | null = null
    if (isManageRevokeView && result.canDeactivate && manageToken) {
      const insightResult = await getPublicPortfolioManageInsights(
        slug,
        manageToken,
        singleRef.id,
      )
      if (insightResult.found) {
        manageInsights = {
          viewCount: insightResult.viewCount,
          lastViewLabel: insightResult.lastView
            ? formatManageLastViewLabel({
                countryCode: insightResult.lastView.countryCode,
                activeSeconds: insightResult.lastView.activeSeconds,
                startedAtIso: insightResult.lastView.startedAt,
              })
            : null,
          linkExpiresLabel: formatManageLinkExpiresLabel(insightResult.linkExpiresAt),
        }
        manageApprovalStatus = {
          approvedSinceLabel: formatManageApprovedSinceLabel(
            insightResult.approvalRespondedAt,
          ),
          isAnonymous: insightResult.isAnonymous,
        }
      }
    }

    return (
      <>
        {sessionTracker}
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
          shareOwnerPosition={
            shareOwner.found ? shareOwner.position : 'Sales Ansprechpartner'
          }
          shareOwnerAvatar={shareOwner.found ? shareOwner.avatar_url : null}
          shareOwnerEmail={shareOwner.found ? shareOwner.email : null}
          shareOwnerPhone={shareOwner.found ? shareOwner.phone : null}
          shareOwnerBookingUrl={shareOwner.found ? shareOwner.booking_url : null}
          canDeactivate={result.canDeactivate}
          revokeMode={revokeMode}
          approvalEditUrl={approvalEditUrl}
          showApprovalEdit={Boolean(approvalEditUrl)}
          buyerLogoUrl={buyerLogoUrl}
          buyerCompanyName={buyerCompanyName}
          recipientToken={recipientToken}
          manageInsights={manageInsights}
          manageApprovalStatus={manageApprovalStatus}
        />
      </>
    )
  }

  const shareOwnerName = shareOwner.found ? shareOwner.name : 'RefStack Team'
  const shareOwnerPosition = shareOwner.found
    ? shareOwner.position
    : 'Sales Ansprechpartner'
  const shareOwnerAvatar = shareOwner.found ? shareOwner.avatar_url : null
  const shareOwnerEmail = shareOwner.found ? shareOwner.email : null
  const shareOwnerPhone = shareOwner.found ? shareOwner.phone : null
  const shareOwnerBookingUrl = shareOwner.found ? shareOwner.booking_url : null

  return (
    <div className="min-h-screen bg-muted/20">
      {sessionTracker}
      {branding.found ? (
        <header className="border-b bg-background/95 px-6 py-5 sm:px-12 lg:px-16">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {buyerLogoUrl ? (
                <div className="flex shrink-0 flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buyerLogoUrl}
                    alt={buyerCompanyName ?? 'Kunde'}
                    className="h-10 max-w-[120px] object-contain"
                  />
                  {buyerCompanyName ? (
                    <span className="text-[10px] text-muted-foreground">
                      für {buyerCompanyName}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="min-w-0">
                <h1
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: branding.primary_color }}
                >
                  {`Referenzportfolio - ${workspaceName}`}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
              </div>
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
            {result.references.length > 0 ? (
              <ShowcaseMultiPortfolio references={result.references} />
            ) : (
              <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
                Für diesen Link sind aktuell keine Referenzen sichtbar.
              </div>
            )}
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
