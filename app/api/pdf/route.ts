import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  ReferencePdfDocument,
} from '@/app/dashboard/references/pdf/template'
import type { PdfOrgBranding, PdfReference, PdfTemplate } from '@/app/dashboard/references/pdf/types'

export const runtime = 'nodejs'

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

function parseTemplate(raw: string | null): PdfTemplate {
  if (raw === 'detail' || raw === 'anonymized') return raw
  return 'one_pager'
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
  const template = parseTemplate(req.nextUrl.searchParams.get('template'))
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
      duration_months,
      companies ( name, logo_url )
    `)
    .eq('id', id)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Referenz nicht gefunden.' }, { status: 404 })
  }

  const normalizedStatus = String(row.status ?? '').toLowerCase()
  if (role === 'sales' && !['approved', 'internal_only', 'anonymized'].includes(normalizedStatus)) {
    return NextResponse.json({ error: 'Keine Berechtigung für diese Referenz.' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, primary_color, secondary_color')
    .eq('id', profile.organization_id)
    .single()

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
    duration_months: row.duration_months ?? null,
  }

  const branding: PdfOrgBranding = {
    name: org?.name ?? 'RefStack',
    logo_url: org?.logo_url ?? null,
    primary_color: org?.primary_color ?? '#0f172a',
    secondary_color: org?.secondary_color ?? '#334155',
  }

  const pdf = await renderToBuffer(
    ReferencePdfDocument({
      reference,
      org: branding,
      template,
    })
  )

  const customerName = sanitizeFileName(reference.company_name || 'Account')
  const titleName = sanitizeFileName(reference.title || 'Referenz')
  const fileName = `${customerName}_${titleName}_RefStack.pdf`

  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
