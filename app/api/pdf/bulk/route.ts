import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { ReferencePdfBundleDocument } from '@/app/dashboard/references/pdf/template'
import type { PdfOrgBranding, PdfReference, PdfTemplate } from '@/app/dashboard/references/pdf/types'
import { computeReferenceDurationMonths } from '@/lib/references/reference-duration-months'

export const runtime = 'nodejs'

function parseTemplate(raw: unknown): PdfTemplate {
  if (raw === 'detail' || raw === 'anonymized') return raw
  return 'one_pager'
}

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { referenceIds?: unknown; template?: unknown }
    | null
  const referenceIds = Array.isArray(body?.referenceIds)
    ? body.referenceIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []
  if (referenceIds.length === 0) {
    return NextResponse.json({ error: 'Keine Referenzen ausgewählt.' }, { status: 400 })
  }
  const template = parseTemplate(body?.template)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Kein Workspace gefunden.' }, { status: 403 })
  }

  const { data: rows, error } = await supabase
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
      company_id,
      companies ( name, logo_url )
    `)
    .eq('organization_id', profile.organization_id)
    .in('id', referenceIds)

  if (error || !rows) {
    return NextResponse.json({ error: 'Referenzen konnten nicht geladen werden.' }, { status: 500 })
  }

  const role = String(profile.role ?? 'sales').toLowerCase()
  const allowedRows =
    role === 'sales'
      ? rows.filter((row) =>
          ['approved', 'internal_only', 'anonymized', 'external', 'internal'].includes(
            String(row.status ?? '').toLowerCase()
          )
        )
      : rows
  if (allowedRows.length === 0) {
    return NextResponse.json({ error: 'Keine berechtigten Referenzen gefunden.' }, { status: 403 })
  }

  const rowById = new Map(allowedRows.map((row) => [row.id, row]))
  const orderedRows = referenceIds
    .map((id) => rowById.get(id))
    .filter((row): row is NonNullable<typeof rows[number]> => Boolean(row))

  const references: PdfReference[] = orderedRows.map((row) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
    return {
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
    }
  })

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, primary_color, secondary_color')
    .eq('id', profile.organization_id)
    .single()

  const branding: PdfOrgBranding = {
    name: org?.name ?? 'RefStack',
    logo_url: org?.logo_url ?? null,
    primary_color: org?.primary_color ?? '#2563EB',
    secondary_color: org?.secondary_color ?? '#1D4ED8',
  }

  const pdf = await renderToBuffer(
    ReferencePdfBundleDocument({
      references,
      org: branding,
      template,
    })
  )

  await Promise.all(
    references.map((reference) =>
      writeAuditLog({
        orgId: profile.organization_id as string,
        userId: user.id,
        action: 'export_pdf',
        entityId: reference.id,
        actionDetails: { reference_id: reference.id, template, mode: 'bulk' },
      })
    )
  )

  const fileName = `${sanitizeFileName(org?.name ?? 'RefStack')}_Portfolio_${references.length}.pdf`
  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
