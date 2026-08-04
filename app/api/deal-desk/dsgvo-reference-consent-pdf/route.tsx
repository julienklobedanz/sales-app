import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'

import { DsgvoReferenceConsentDocument } from '@/lib/deal-desk/pdf/dsgvo-reference-consent-document'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const FILE_NAME = 'DSGVO-Vereinbarung-Referenzperson.pdf'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Kein Workspace gefunden.' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url')
    .eq('id', profile.organization_id)
    .maybeSingle()

  const providerName = String(org?.name ?? '').trim() || 'Dienstleister'

  const pdf = await renderToBuffer(
    <DsgvoReferenceConsentDocument
      providerName={providerName}
      providerLogoUrl={org?.logo_url ?? null}
    />,
  )

  const bytes = new Uint8Array(pdf)
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${FILE_NAME}"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
