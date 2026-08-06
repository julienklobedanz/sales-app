import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractPlainTextFromBuffer } from '@/lib/document-text'
import { parseReferenceHeuristicsFromText } from '@/lib/references/heuristic-reference-extract'
import {
  extractCompanyNameFromFileName,
  extractProjectTitleHintFromFileName,
} from '@/lib/references/bulk-import-grouping'
import { log } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

/** PDF/PPTX-Vorschau für Bulk-Import (Projektname + Kunde, ohne OpenAI). */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Nicht angemeldet.' },
      { status: 401 },
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Keine Datei.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const plain = await extractPlainTextFromBuffer(buffer, file.name, file.type)
    if (!plain.success) {
      return NextResponse.json({ success: false, error: plain.error }, { status: 400 })
    }

    const parsed = parseReferenceHeuristicsFromText(plain.text, { fileName: file.name })
    const fileNameCompany = extractCompanyNameFromFileName(file.name)
    const fileNameTitle = extractProjectTitleHintFromFileName(file.name)
    const projectName =
      parsed.title?.trim() ||
      fileNameTitle ||
      file.name.replace(/\.[^.]+$/, '').trim() ||
      file.name
    const companyName = parsed.company_name?.trim() || fileNameCompany || null

    return NextResponse.json({
      success: true,
      projectName,
      companyName,
    })
  } catch (e) {
    log.error('preview failed', { action: 'bulk-import.preview' }, e)
    return NextResponse.json(
      { success: false, error: 'Vorschau konnte nicht erstellt werden.' },
      { status: 500 },
    )
  }
}
