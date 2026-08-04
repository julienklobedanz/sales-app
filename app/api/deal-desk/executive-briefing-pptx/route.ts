import { NextRequest, NextResponse } from 'next/server'

import { buildExecutiveBriefingPptxBuffer } from '@/lib/deal-desk/executive-briefing-pptx'
import { resolveExecutiveBriefingPptxData } from '@/lib/deal-desk/resolve-executive-briefing-pptx-data'
import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { defaultWorkspaceState } from '@/lib/deal-desk/workspace-state'
import { mergeWorkspaceWithNormalizedOverlay } from '@/lib/deal-desk/workspace-merge'
import { loadNormalizedWorkspaceOverlay } from '@/lib/deal-desk/workspace-persistence'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function sanitizeFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

function parseAnalysisSnapshot(raw: unknown): DealDeskMockAnalysis | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Partial<DealDeskMockAnalysis>
  if (!o.customerName && !o.icpSummary && !o.executiveBriefing) return null
  return o as DealDeskMockAnalysis
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
  if (!projectId) {
    return NextResponse.json({ error: 'projectId fehlt.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Kein Workspace gefunden.' }, { status: 403 })
  }

  const { data: project, error } = await supabase
    .from('deal_desk_projects')
    .select('id, project_name, customer_name, analysis_snapshot')
    .eq('id', projectId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (error || !project) {
    return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 })
  }

  const analysis = parseAnalysisSnapshot(project.analysis_snapshot)
  if (!analysis) {
    return NextResponse.json(
      { error: 'Keine Analyse-Daten für dieses Projekt.' },
      { status: 422 },
    )
  }

  const overlay = await loadNormalizedWorkspaceOverlay(
    supabase,
    projectId,
    profile.organization_id,
  )
  const baseWorkspace = defaultWorkspaceState(analysis.redFlags ?? [])
  const workspace = mergeWorkspaceWithNormalizedOverlay(
    baseWorkspace,
    overlay,
    baseWorkspace.smeCustomExperts,
  )
  const redFlags: DealDeskRedFlag[] =
    workspace.redFlags.length > 0 ? workspace.redFlags : (analysis.redFlags ?? [])

  const pptxData = resolveExecutiveBriefingPptxData({
    projectName: String(project.project_name ?? 'RFP'),
    analysis,
    redFlags,
  })

  const buffer = await buildExecutiveBriefingPptxBuffer(pptxData)

  const customerName = sanitizeFileName(
    pptxData.customerName || String(project.customer_name ?? 'Kunde'),
  )
  const fileName = `${customerName}_Executive_Briefing_RefStack.pptx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
