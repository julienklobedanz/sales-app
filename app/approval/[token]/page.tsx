import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Building2, Globe } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { ApprovalDecisionForm } from './approval-decision-form'

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
      contract_type,
      project_start,
      project_end,
      approval_message,
      approval_requester_name,
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
  let primary = '#0f172a'
  let secondary = '#334155'

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

  if (!pending) {
    return <InvalidLink />
  }

  const requester = typeof row.approval_requester_name === 'string' ? row.approval_requester_name.trim() : ''
  const message = typeof row.approval_message === 'string' ? row.approval_message.trim() : ''

  const vol = formatReferenceVolume((row.volume_eur as string | null) ?? null) || '—'
  const start =
    row.project_start && String(row.project_start) !== ''
      ? formatDateUtcDe(String(row.project_start))
      : '—'
  const end =
    row.project_end && String(row.project_end) !== ''
      ? formatDateUtcDe(String(row.project_end))
      : '—'

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="text-center space-y-4">
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
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: primary }}>
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
          {message ? (
            <div className="rounded-md border border-border bg-background/80 p-4 text-left text-sm text-foreground whitespace-pre-wrap">
              {message}
            </div>
          ) : null}
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referenz (Lesen)</CardTitle>
            <CardDescription>Kein Login erforderlich.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="opacity-70">
                  <AppIcon icon={Building2} size={16} />
                </span>
                {row.industry ?? '—'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="opacity-70">
                  <AppIcon icon={Globe} size={16} />
                </span>
                {row.country ?? '—'}
              </div>
            </div>

            {row.summary ? (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Kurzbeschreibung</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.summary}</p>
              </div>
            ) : null}

            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Herausforderung</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {row.customer_challenge ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Unsere Lösung</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {row.our_solution ?? '—'}
              </p>
            </div>

            <div className="grid gap-2 rounded-md border border-border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Volumen</span>
                <span className="font-medium tabular-nums">{vol}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Vertragsart</span>
                <span className="font-medium">{row.contract_type ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektstart</span>
                <span className="font-medium">{start}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektende</span>
                <span className="font-medium">{end}</span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-center text-sm font-semibold">Ihre Entscheidung</h3>
              <ApprovalDecisionForm token={token} referenceTitle={row.title} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
