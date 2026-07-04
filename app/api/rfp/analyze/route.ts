import { NextRequest, NextResponse } from 'next/server'

import { analyzeRfp } from '@/lib/deal-desk/analyze-rfp'
import { finalizeRfpAnalysis } from '@/lib/deal-desk/finalize-rfp-analysis'
import { ensureDealDeskProjectForDeal } from '@/lib/deal-desk/ensure-deal-desk-project'
import { syncRfpDeadlinesFromTimeline } from '@/lib/deals/deadlines'
import { extractPlainTextFromFile } from '@/lib/extract-document-plain-text'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 300

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180)
  return base || 'upload.bin'
}

/**
 * Dünner Wrapper um `analyzeRfp` — persistiert in `deal_desk_projects` (deal-verknüpft).
 * Liefert dieselbe Coverage/Requirements-Struktur wie zuvor für `DealRfpSection`.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) {
    return NextResponse.json(
      { success: false, error: 'Keine Organisation zugeordnet.' },
      { status: 403 }
    )
  }

  const orgId = visibility.organizationId
  const salesVisibleOnly = visibility.salesVisibleOnly

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'RFP-Analyse ist deaktiviert: OPENAI_API_KEY ist nicht konfiguriert (fehlender OPENAI-Schlüssel).',
      },
      { status: 501 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const dealIdRaw = formData.get('dealId')
  const file = formData.get('file')

  const dealId = typeof dealIdRaw === 'string' ? dealIdRaw.trim() : ''
  if (!dealId) {
    return NextResponse.json({ success: false, error: 'dealId fehlt.' }, { status: 400 })
  }

  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ success: false, error: 'Keine gültige Datei.' }, { status: 400 })
  }

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, title, industry, volume')
    .eq('id', dealId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (dealErr || !deal) {
    return NextResponse.json(
      { success: false, error: 'Deal nicht gefunden oder keine Berechtigung.' },
      { status: 404 }
    )
  }

  let accountContextPrefix = ''
  const companyContextIdRaw = formData.get('companyContextId')
  if (typeof companyContextIdRaw === 'string' && companyContextIdRaw.trim()) {
    const { data: co } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyContextIdRaw.trim())
      .eq('organization_id', orgId)
      .maybeSingle()
    if (co?.name) {
      accountContextPrefix = `Relevanter Account-Kontext (optional): ${co.name}\n\n`
    }
  }

  const ensured = await ensureDealDeskProjectForDeal(supabase, {
    organizationId: orgId,
    userId: user.id,
    dealId,
    projectName: String(deal.title ?? 'RFP-Analyse'),
  })
  if ('error' in ensured) {
    return NextResponse.json({ success: false, error: ensured.error }, { status: 500 })
  }
  const projectId = ensured.projectId

  await supabase
    .from('deal_desk_projects')
    .update({ analysis_status: 'processing', error_message: null })
    .eq('id', projectId)

  const fail = async (message: string, status = 500) => {
    await supabase
      .from('deal_desk_projects')
      .update({ analysis_status: 'failed', error_message: message })
      .eq('id', projectId)
    return NextResponse.json({ success: false, error: message }, { status })
  }

  const { data: docRow, error: docErr } = await supabase
    .from('deal_desk_documents')
    .insert({
      project_id: projectId,
      organization_id: orgId,
      file_name: file.name || 'document',
      mime_type: file.type || null,
      size_bytes: file.size,
      extract_status: 'pending',
      sort_order: 0,
    })
    .select('id')
    .single()

  if (docErr || !docRow?.id) {
    return fail(docErr?.message ?? 'Dokument-Metadaten fehlgeschlagen.')
  }

  const docId = docRow.id as string
  const safeName = sanitizeFileName(file.name || 'document')
  const storagePath = `${orgId}/deal-desk/${projectId}/${docId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('rfp-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError) {
    return fail(`Upload fehlgeschlagen: ${uploadError.message}`)
  }

  await supabase
    .from('deal_desk_documents')
    .update({ storage_path: storagePath, extract_status: 'completed' })
    .eq('id', docId)

  const plain = await extractPlainTextFromFile(file, { maxChars: 120_000 })
  if (!plain.ok) {
    return fail(plain.error, 400)
  }

  const mergedText = accountContextPrefix + plain.text
  const fileNames = [file.name || 'document']

  const analyzed = await analyzeRfp({
    apiKey,
    supabase,
    organizationId: orgId,
    salesVisibleOnly,
    projectName: String(deal.title ?? 'RFP-Analyse'),
    fileNames,
    mergedText,
    deal: {
      title: deal.title ?? null,
      industry: deal.industry ?? null,
      volume: deal.volume ?? null,
    },
    projectDocuments: [
      {
        id: docId,
        file_name: file.name || 'document',
        storage_path: storagePath,
        mime_type: file.type || null,
      },
    ],
  })

  if ('error' in analyzed) {
    return fail(analyzed.error, 422)
  }

  const persistedSnapshot = await finalizeRfpAnalysis(supabase, {
    projectId,
    organizationId: orgId,
    dealId,
    analyzed,
  })

  const { error: doneError } = await supabase
    .from('deal_desk_projects')
    .update({
      analysis_status: 'completed',
      analysis_snapshot: persistedSnapshot,
      analysis_source: 'api',
      win_probability: analyzed.snapshot.winProbability,
      customer_name: analyzed.snapshot.customerName,
      error_message: null,
    })
    .eq('id', projectId)

  if (doneError) {
    return fail(doneError.message)
  }

  await syncRfpDeadlinesFromTimeline(supabase, {
    dealId,
    organizationId: orgId,
    timelineItems: analyzed.snapshot.timelineItems ?? [],
  })

  return NextResponse.json({
    success: true,
    projectId,
    /** @deprecated Alias für projectId — DealRfpSection-Kompatibilität */
    analysisId: projectId,
    storagePath,
    requirements: analyzed.requirements,
    coverage: analyzed.coverage,
  })
}
