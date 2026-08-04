import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'

import { buildExecutiveBriefingText } from '@/lib/deal-desk/executive-briefing'
import { ExecutiveBriefingPdfDocument } from '@/lib/deal-desk/executive-briefing-pdf'
import { loadDealExecutiveBriefingContext } from '@/lib/deal-desk/load-deal-executive-briefing'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: dealId } = await context.params
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

  const briefing = await loadDealExecutiveBriefingContext(
    supabase,
    profile.organization_id,
    dealId,
  )

  if (!briefing) {
    return NextResponse.json(
      { error: 'Keine abgeschlossene RFP-Analyse für diesen Deal.' },
      { status: 422 },
    )
  }

  const bodyText = buildExecutiveBriefingText({
    projectName: briefing.projectName,
    analysis: briefing.analysis,
    redFlags: briefing.redFlags,
  })

  const generatedLabel = new Date().toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const pdf = await renderToBuffer(
    <ExecutiveBriefingPdfDocument
      title={briefing.projectName}
      bodyText={bodyText}
      generatedLabel={`Erstellt ${generatedLabel}`}
    />,
  )

  const customerName = sanitizeFileName(
    briefing.analysis.customerName || briefing.projectName,
  )
  const fileName = `${customerName}_Executive_Briefing.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
