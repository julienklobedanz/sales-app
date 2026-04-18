import { NextRequest, NextResponse } from 'next/server'

import { extractPlainTextFromFile } from '@/lib/extract-document-plain-text'
import { buildRfpCoverageReport } from '@/lib/rfp-coverage'
import { extractRequirementsFromRfpText } from '@/lib/rfp-requirements'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180)
  return base || 'upload.bin'
}

/**
 * POST multipart: `dealId` (uuid), `file` (PDF/DOCX).
 * Speichert Datei, extrahiert Text, KI-Anforderungen, Coverage via Embeddings + `match_references`.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json(
      { success: false, error: 'Keine Organisation zugeordnet.' },
      { status: 403 }
    )
  }

  const orgId = profile.organization_id as string
  const role = (profile as { role?: string }).role ?? 'sales'
  const salesVisibleOnly = role === 'sales'

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).' },
      { status: 500 }
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

  const { data: inserted, error: insertError } = await supabase
    .from('deal_rfp_analyses')
    .insert({
      deal_id: dealId,
      organization_id: orgId,
      source_file_name: file.name || 'document',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    console.error('deal_rfp_analyses insert', insertError)
    return NextResponse.json(
      { success: false, error: insertError?.message ?? 'Analyse konnte nicht angelegt werden.' },
      { status: 500 }
    )
  }

  const analysisId = inserted.id as string
  const safeName = sanitizeFileName(file.name || 'document')
  const storagePath = `${orgId}/${dealId}/${analysisId}/${safeName}`

  const fail = async (message: string) => {
    await supabase
      .from('deal_rfp_analyses')
      .update({ status: 'failed', error_message: message })
      .eq('id', analysisId)
      .eq('organization_id', orgId)
  }

  const { error: uploadError } = await supabase.storage
    .from('rfp-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError) {
    await fail(uploadError.message)
    return NextResponse.json(
      { success: false, error: `Upload fehlgeschlagen: ${uploadError.message}` },
      { status: 500 }
    )
  }

  await supabase
    .from('deal_rfp_analyses')
    .update({ status: 'processing', storage_path: storagePath })
    .eq('id', analysisId)
    .eq('organization_id', orgId)

  const plain = await extractPlainTextFromFile(file, { maxChars: 120_000 })
  if (!plain.ok) {
    await fail(plain.error)
    return NextResponse.json({ success: false, error: plain.error }, { status: 400 })
  }

  const textForExtraction = accountContextPrefix + plain.text

  const extracted = await extractRequirementsFromRfpText(apiKey, textForExtraction)
  if ('error' in extracted) {
    await fail(extracted.error)
    return NextResponse.json({ success: false, error: extracted.error }, { status: 422 })
  }

  const coverage = await buildRfpCoverageReport(supabase, {
    apiKey,
    organizationId: orgId,
    salesVisibleOnly,
    deal: {
      title: deal.title ?? null,
      industry: deal.industry ?? null,
      volume: deal.volume ?? null,
    },
    requirements: extracted.requirements,
  })

  const { error: doneError } = await supabase
    .from('deal_rfp_analyses')
    .update({
      status: 'completed',
      extracted_requirements: extracted.requirements,
      coverage_report: coverage,
      error_message: null,
    })
    .eq('id', analysisId)
    .eq('organization_id', orgId)

  if (doneError) {
    await fail(doneError.message)
    return NextResponse.json(
      { success: false, error: doneError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    analysisId,
    storagePath,
    requirements: extracted.requirements,
    coverage,
  })
}
