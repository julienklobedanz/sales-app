import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractDataFromDocument } from '@/lib/document-extraction'

export const runtime = 'nodejs'
export const maxDuration = 120

/** KI-Import aus PDF/DOCX/PPTX/PNG (Node-Runtime, native pdf-parse + Vision-OCR). */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const result = await extractDataFromDocument(formData)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('[reference-extract]', e)
    return NextResponse.json(
      {
        success: false,
        error:
          'Ein unerwarteter Fehler ist aufgetreten. Bitte Dateigröße (max. 4,5 MB) und Format prüfen.',
      },
      { status: 500 }
    )
  }
}
