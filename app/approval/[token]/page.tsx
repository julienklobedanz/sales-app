import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Building2, Globe } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
import { ApprovalDecisionForm } from './approval-decision-form'
import { ApprovalCaseDataBar } from './approval-case-data-bar'
import { ApprovalReferenceSections } from './approval-reference-sections'
import { ApprovalDelegateDialog } from './approval-delegate-dialog'

function InvalidLink() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>Link ungültig</CardTitle>
          <CardDescription>
            Dieser Link ist nicht mehr gültig oder wurde bereits verwendet. Bitte wenden Sie sich bei
            Rückfragen an Ihren Ansprechpartner.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

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
      customer_approval_status,
      customer_challenge,
      our_solution,
      volume_eur,
      project_status,
      project_start,
      project_end,
      approval_message,
      approval_requester_name,
      approval_owner_name,
      approval_expires_at,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      approval_scope_reference_call,
      approval_scope_logo_use,
      approval_scope_press_release,
      approval_grace_until,
      approval_quote_proposed,
      approval_reference_giver_name,
      approval_reference_giver_title,
      companies (
        name,
        organization_id
      )
    `
    )
    .eq('approval_token', token)
    .maybeSingle()

  if (error || !row) {
    return <InvalidLink />
  }

  const companyRaw = row.companies
  const company =
    Array.isArray(companyRaw) && companyRaw.length > 0
      ? (companyRaw[0] as { name?: string; organization_id?: string | null })
      : (companyRaw as { name?: string; organization_id?: string | null } | null)

  const orgId = company?.organization_id ?? null
  let orgName = company?.name ?? '—'
  let logoUrl: string | null = null
  let primary = '#2563EB'
  let secondary = '#1D4ED8'

  if (orgId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name, logo_url, primary_color, secondary_color')
      .eq('id', orgId)
      .maybeSingle()
    if (orgRow) {
      orgName = orgRow.name ?? orgName
      logoUrl = orgRow.logo_url ?? null
      primary = orgRow.primary_color?.trim() || primary
      secondary = orgRow.secondary_color?.trim() || secondary
    }
  }

  const pending =
    row.customer_approval_status === 'pending' ||
    (row.customer_approval_status == null && String(row.status ?? '') === 'pending')
  const nowTs = new Date().getTime()
  const isExpired =
    !!row.approval_expires_at && new Date(String(row.approval_expires_at)).getTime() < nowTs
  const inGrace =
    !!row.approval_grace_until && new Date(String(row.approval_grace_until)).getTime() >= nowTs

  if (!pending || (isExpired && !inGrace)) {
    return <InvalidLink />
  }

  const requester = typeof row.approval_requester_name === 'string' ? row.approval_requester_name.trim() : ''
  const message = typeof row.approval_message === 'string' ? row.approval_message.trim() : ''
  const scopeNamedAvailable = !!row.approval_scope_named_mention
  const scopeAnonymousAvailable = !!row.approval_scope_anonymous_mention
  const extraScopeItems = [
    row.approval_scope_reference_call ? 'Referenz-Call' : null,
    row.approval_scope_logo_use ? 'Logo-Nutzung' : null,
    row.approval_scope_press_release ? 'Pressemeldung / Öffentliches Zitat' : null,
  ].filter(Boolean) as string[]

  const vol = formatReferenceVolume((row.volume_eur as string | null) ?? null) || '—'
  const start =
    row.project_start && String(row.project_start) !== ''
      ? formatDateUtcDe(String(row.project_start))
      : '—'
  const end =
    row.project_end && String(row.project_end) !== ''
      ? formatProjectEndWithDurationDe({
          project_start: (row.project_start as string | null) ?? null,
          project_end: (row.project_end as string | null) ?? null,
          project_status: (row.project_status as string | null) ?? null,
          formatEndDate: (iso) => formatDateUtcDe(iso),
        })
      : '—'

  const caseDataItems = [
    {
      label: 'Branche',
      value: row.industry ?? '—',
      icon: <AppIcon icon={Building2} size={14} />,
    },
    {
      label: 'Land',
      value: row.country ?? '—',
      icon: <AppIcon icon={Globe} size={14} />,
    },
    { label: 'Volumen', value: vol },
    { label: 'Projektstart', value: start },
    { label: 'Projektende', value: end },
  ]

  const proposedQuote =
    typeof row.approval_quote_proposed === 'string' ? row.approval_quote_proposed.trim() : ''
  const referenceGiverName =
    typeof row.approval_reference_giver_name === 'string' ? row.approval_reference_giver_name.trim() : ''
  const referenceGiverTitle =
    typeof row.approval_reference_giver_title === 'string' ? row.approval_reference_giver_title.trim() : ''

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-10 space-y-4 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- öffentliche Branding-URL aus Storage
            <img
              src={logoUrl}
              alt={orgName}
              className="mx-auto h-12 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <p className="text-sm font-medium" style={{ color: secondary }}>
            {orgName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: primary }}>
            {row.title}
          </h1>
          {requester ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{requester}</span> bittet Sie um Freigabe
              dieser Referenz.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Bitte prüfen Sie die Referenz und entscheiden Sie.</p>
          )}
          <div className="flex justify-center">
            <ApprovalDelegateDialog token={token} />
          </div>
          {message ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 text-left text-sm text-foreground whitespace-pre-wrap shadow-sm">
              {message}
            </div>
          ) : null}
          {(row.approval_owner_name || row.approval_expires_at || isExpired) ? (
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {row.approval_owner_name ? (
                <span>
                  <span className="font-medium text-foreground">Verantwortlich:</span>{' '}
                  {row.approval_owner_name}
                </span>
              ) : null}
              {row.approval_expires_at ? (
                <span>
                  <span className="font-medium text-foreground">Antwort bis:</span>{' '}
                  {formatDateUtcDe(String(row.approval_expires_at))}
                </span>
              ) : null}
              {isExpired && inGrace ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700">
                  Karenzzeit aktiv
                </span>
              ) : null}
            </div>
          ) : null}
        </header>

        <ApprovalCaseDataBar items={caseDataItems} referenceTitle={row.title} />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <section className="space-y-4 lg:col-span-7">
            <h2 className="text-lg font-semibold text-foreground">Referenz-Vorschau</h2>

            <ApprovalReferenceSections
              summary={row.summary}
              challenge={row.customer_challenge}
              solution={row.our_solution}
            />

            {extraScopeItems.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {extraScopeItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <aside className="lg:col-span-5">
            <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold text-foreground">Ihre Entscheidung</h2>
              <ApprovalDecisionForm
                token={token}
                referenceTitle={row.title}
                orgName={orgName}
                companyName={company?.name}
                scopeNamedAvailable={scopeNamedAvailable}
                scopeAnonymousAvailable={scopeAnonymousAvailable}
                initialApprovedQuote={proposedQuote}
                initialReferenceGiverName={referenceGiverName}
                initialReferenceGiverTitle={referenceGiverTitle}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
