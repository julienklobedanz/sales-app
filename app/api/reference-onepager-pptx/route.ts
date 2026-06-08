import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events/log-event'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { buildReferenceOnepagerPptxBuffer } from '@/lib/reference-onepager-pptx'
import { formatReferenceDate, formatReferenceVolume, normalizeOrgDateDisplayFormat } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'

export const runtime = 'nodejs'

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

function parseExportSettings(raw: unknown): { pdf_logo_enabled?: boolean } {
  if (!raw || typeof raw !== 'object') return {}
  const logo = (raw as Record<string, unknown>).pdf_logo_enabled
  return { pdf_logo_enabled: typeof logo === 'boolean' ? logo : undefined }
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
  if (!id) {
    return NextResponse.json({ error: 'referenceId fehlt.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Kein Workspace gefunden.' }, { status: 403 })
  }

  const role = (profile.role as string | null) ?? 'sales'

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
      volume_eur,
      contract_type,
      project_start,
      project_end,
      project_status,
      customer_challenge,
      our_solution,
      companies ( name, logo_url )
    `
    )
    .eq('id', id)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Referenz nicht gefunden.' }, { status: 404 })
  }

  const normalizedStatus = String(row.status ?? '').toLowerCase()
  if (
    role === 'sales' &&
    !['approved', 'internal_only', 'anonymized', 'external', 'internal'].includes(normalizedStatus)
  ) {
    return NextResponse.json({ error: 'Keine Berechtigung für diese Referenz.' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, export_settings, date_display_format')
    .eq('id', profile.organization_id)
    .single()

  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  const companyName = String((company as { name?: string } | null)?.name ?? '—')
  const companyLogo = (company as { logo_url?: string | null } | null)?.logo_url ?? null

  const exportSettings = parseExportSettings(org?.export_settings)
  const logoEnabled = exportSettings.pdf_logo_enabled !== false
  const logoUrl = logoEnabled ? org?.logo_url ?? companyLogo : null

  const dateFmt = normalizeOrgDateDisplayFormat(org?.date_display_format)
  const exportedAtLabel = new Date().toLocaleDateString('de-DE', { dateStyle: 'long' })

  const buffer = await buildReferenceOnepagerPptxBuffer({
    title: String(row.title ?? 'Referenz'),
    companyName,
    status: String(row.status ?? ''),
    projectStatus: row.project_status ?? null,
    summary: row.summary ?? null,
    industry: row.industry ?? null,
    country: row.country ?? null,
    customerChallenge: row.customer_challenge ?? null,
    ourSolution: row.our_solution ?? null,
    volumeEur: formatReferenceVolume(row.volume_eur) || null,
    contractType: formatContractTypeDisplay(row.contract_type) || null,
    projectStart: row.project_start ? formatReferenceDate(row.project_start, dateFmt) : null,
    projectEnd: row.project_end ? formatReferenceDate(row.project_end, dateFmt) : null,
    logoUrl,
    orgName: String(org?.name ?? 'RefStack'),
    exportedAtLabel,
  })

  const customerName = sanitizeFileName(companyName || 'Account')
  const titleName = sanitizeFileName(String(row.title ?? 'Referenz'))
  const fileName = `${customerName}_${titleName}_RefStack_Onepager.pptx`

  void logEvent({
    organizationId: profile.organization_id as string,
    eventType: 'reference_exported',
    referenceId: id,
    payload: { format: 'pptx_onepager' },
    createdBy: user.id,
  })
  void writeAuditLog({
    orgId: profile.organization_id as string,
    userId: user.id,
    action: 'export_pptx_onepager',
    entityId: id,
    actionDetails: { reference_id: id },
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
