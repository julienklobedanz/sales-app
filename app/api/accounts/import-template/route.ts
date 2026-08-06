import { NextResponse } from 'next/server'

import { buildAccountsImportTemplateXlsx } from '@/lib/accounts/accounts-import-template'
import type { AccountEntityKind } from '@/lib/accounts/account-entity'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function parseEntityKind(raw: string | null): AccountEntityKind | null {
  if (raw === 'account' || raw === 'partner') return raw
  return null
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const entityKind = parseEntityKind(new URL(request.url).searchParams.get('kind'))
  if (!entityKind) {
    return NextResponse.json({ error: 'Ungültiger Import-Typ.' }, { status: 400 })
  }

  const { buffer, filename } = buildAccountsImportTemplateXlsx(entityKind)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
