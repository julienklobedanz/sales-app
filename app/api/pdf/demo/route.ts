import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ReferencePdfDocument } from '@/app/dashboard/references/pdf/template'
import type { PdfOrgBranding, PdfReference, PdfTemplate } from '@/app/dashboard/references/pdf/types'

export const runtime = 'nodejs'

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

  const template = parseTemplate(req.nextUrl.searchParams.get('template'))
  const logoEnabled = req.nextUrl.searchParams.get('logo') !== '0'

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Kein Workspace gefunden.' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, primary_color, secondary_color')
    .eq('id', profile.organization_id)
    .single()

  const branding: PdfOrgBranding = {
    name: org?.name ?? 'RefStack',
    logo_url: logoEnabled ? org?.logo_url ?? null : null,
    primary_color: org?.primary_color ?? '#0f172a',
    secondary_color: org?.secondary_color ?? '#334155',
  }

  const reference: PdfReference = {
    id: 'demo',
    title: 'Demo-Referenz (Vorschau)',
    summary: 'Dieses PDF zeigt die aktuell gewählten Export-Template-Einstellungen.',
    industry: 'Software',
    country: 'DE',
    status: 'approved',
    tags: 'Go-to-Market, Enterprise, Transformation',
    company_name: 'Musterkunde GmbH',
    company_logo_url: null,
    website: null,
    employee_count: 1200,
    volume_eur: '500k-1M EUR',
    contract_type: 'Projekt',
    incumbent_provider: null,
    competitors: null,
    customer_challenge: 'Komplexe Ausschreibung mit vielen Stakeholdern und engen Timelines.',
    our_solution: 'Strukturierter Prozess, klare Storyline und skalierbare Referenzbausteine.',
    customer_contact: null,
    project_status: 'active',
    project_start: null,
    project_end: null,
    duration_months: 6,
  }

  const pdf = await renderToBuffer(
    ReferencePdfDocument({
      reference,
      org: branding,
      template,
    })
  )

  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="RefStack_Demo_Export.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}

