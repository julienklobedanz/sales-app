import { NextRequest, NextResponse } from 'next/server'
import { extractDataFromDocument } from '../../dashboard/new/extract-reference-data'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const result = await extractDataFromDocument(formData)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, data: result.data }, { status: 200 })
  } catch (e) {
    console.error('rfp-match error', e)
    return NextResponse.json(
      { success: false, error: 'RFP-Analyse fehlgeschlagen. Bitte später erneut versuchen.' },
      { status: 500 }
    )
  }
}

