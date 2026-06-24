import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events/log-event'
import { writeAuditLog } from '@/lib/audit/log-audit'
import {
  ReferencePdfDocument,
} from '@/lib/evidence/pdf/template'
import type { PdfOrgBranding, PdfReference } from '@/lib/evidence/pdf/types'
import { computeReferenceDurationMonths } from '@/lib/references/reference-duration-months'
import {
  parsePdfExportSettings,
  resolvePdfTemplate,
} from '@/lib/references/pdf-export-settings'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'
import { buildServerTimingHeader, withTiming } from '@/lib/observability/timing'

export const runtime = 'nodejs'

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('referenceId')?.trim()
  const templateParam = req.nextUrl.searchParams.get('template')
  if (!id) {
    return NextResponse.json({ error: 'referenceId fehlt.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Kein Workspace gefunden.' }, { status: 403 })
  }

  const { systemRole, functionRole } = parseProfileRoles(profile)

  const { data: row, error } = await supabase
    .from('references')
    .select(`
      id,
      title,
      summary,
      industry,
      country,
      status,
      tags,
      website,
      employee_count,
      volume_eur,
      contract_type,
      incumbent_provider,
      competitors,
      customer_challenge,
      our_solution,
      customer_contact,
      project_status,
      project_start,
      project_end,
      approval_quote_approved,
      approval_reference_giver_name,
      approval_reference_giver_title,
      companies ( name, logo_url )
    `)
    .eq('id', id)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Referenz nicht gefunden.' }, { status: 404 })
  }

  const normalizedStatus = String(row.status ?? '').toLowerCase()
  const salesExportStatuses = ['approved', 'internal_only', 'anonymized', 'external', 'internal']
  if (
    profileIsSalesRestricted(systemRole, functionRole) &&
    !salesExportStatuses.includes(normalizedStatus)
  ) {
    return NextResponse.json({ error: 'Keine Berechtigung für diese Referenz.' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, primary_color, secondary_color, export_settings')
    .eq('id', profile.organization_id)
    .single()

  const exportSettings = parsePdfExportSettings(org?.export_settings)
  const template = resolvePdfTemplate(templateParam, exportSettings)

  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  const reference: PdfReference = {
    id: row.id,
    title: row.title,
    summary: row.summary ?? null,
    industry: row.industry ?? null,
    country: row.country ?? null,
    status: row.status,
    tags: row.tags ?? null,
    company_name: company?.name ?? '—',
    company_logo_url: company?.logo_url ?? null,
    website: row.website ?? null,
    employee_count: row.employee_count ?? null,
    volume_eur: row.volume_eur ?? null,
    contract_type: row.contract_type ?? null,
    incumbent_provider: row.incumbent_provider ?? null,
    competitors: row.competitors ?? null,
    customer_challenge: row.customer_challenge ?? null,
    our_solution: row.our_solution ?? null,
    customer_contact: row.customer_contact ?? null,
    project_status: row.project_status ?? null,
    project_start: row.project_start ?? null,
    project_end: row.project_end ?? null,
    duration_months: computeReferenceDurationMonths({
      project_start: row.project_start ?? null,
      project_end: row.project_end ?? null,
      project_status: row.project_status ?? null,
    }),
    approval_quote_approved: row.approval_quote_approved ?? null,
    approval_reference_giver_name: row.approval_reference_giver_name ?? null,
    approval_reference_giver_title: row.approval_reference_giver_title ?? null,
  }

  const branding: PdfOrgBranding = {
    name: org?.name ?? 'RefStack',
    logo_url: exportSettings.pdf_logo_enabled === false ? null : org?.logo_url ?? null,
    primary_color: org?.primary_color ?? '#2563EB',
    secondary_color: org?.secondary_color ?? '#1D4ED8',
  }

  const exportedAtLabel = new Date().toLocaleDateString('de-DE', { dateStyle: 'long' })
  const { result: pdf, ms: generateMs } = await withTiming(
    'export.pdf',
    () =>
      renderToBuffer(
        ReferencePdfDocument({
          reference,
          org: branding,
          template,
          exportedAtLabel,
        })
      ),
    { organizationId: profile.organization_id as string, referenceId: id }
  )

  const customerName = sanitizeFileName(reference.company_name || 'Account')
  const titleName = sanitizeFileName(reference.title || 'Referenz')
  const fileName = `${customerName}_${titleName}_RefStack.pdf`

  void logEvent({
    organizationId: profile.organization_id as string,
    eventType: 'reference_exported',
    referenceId: id,
    payload: { template },
    createdBy: user.id,
  })
  void writeAuditLog({
    orgId: profile.organization_id as string,
    userId: user.id,
    action: 'export_pdf',
    entityId: id,
    actionDetails: { reference_id: id, template },
  })

  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'Server-Timing': buildServerTimingHeader([{ name: 'export.pdf', ms: generateMs }]),
    },
  })
}
