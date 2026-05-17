import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyBulkImportExtractionFromBuffer } from '@/lib/references/bulk-import-extraction-apply'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Extraktion direkt aus der hochgeladenen Datei (ohne Storage-Download). */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Keine Berechtigung.' }, { status: 403 })
  }

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) {
    return NextResponse.json({ success: false, error: 'Keine Organisation.' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const referenceId = String(formData.get('referenceId') ?? '').trim()
    const file = formData.get('file')
    if (!referenceId) {
      return NextResponse.json({ success: false, error: 'Referenz-ID fehlt.' }, { status: 400 })
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Keine Datei übergeben.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await applyBulkImportExtractionFromBuffer(
      supabase,
      organizationId,
      referenceId,
      buffer,
      file.name || 'document.pdf'
    )

    return NextResponse.json(result)
  } catch (e) {
    console.error('[bulk-import/extract]', e)
    return NextResponse.json(
      { success: false, error: 'Extraktion fehlgeschlagen.' },
      { status: 500 }
    )
  }
}
