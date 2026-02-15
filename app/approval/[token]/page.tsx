import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe } from 'lucide-react'
import { ApprovalActions } from './approval-actions'

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createServerSupabaseClient()

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      industry,
      country,
      status,
      approval_token,
      companies ( name )
    `
    )
    .eq('approval_token', token)
    .single()

  if (error || !row) notFound()

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? (row.companies[0] as { name?: string })
      : (row.companies as { name?: string } | null)
  const company_name = company?.name ?? '—'

  const ref = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    industry: row.industry,
    country: row.country,
    status: row.status,
    company_name,
  }

  if (ref.status !== 'pending') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Bereits bearbeitet</CardTitle>
            <CardDescription>
              Diese Anfrage wurde bereits mit dem Status &quot;{ref.status}&quot;
              abgeschlossen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Freigabe anfordern</h1>
          <p className="text-muted-foreground">
            Bitte prüfen Sie die Details und wählen Sie eine Freigabestufe.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>{ref.company_name}</CardTitle>
                <CardDescription>{ref.title}</CardDescription>
              </div>
              <Badge variant="outline">Wartet auf Prüfung</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-y py-4 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 opacity-50" /> {ref.industry ?? '—'}
              </div>
              <div className="flex items-center gap-2">
                <Globe className="size-4 opacity-50" /> {ref.country ?? '—'}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Zusammenfassung</h4>
              <p className="text-muted-foreground text-sm">
                {ref.summary || 'Keine Zusammenfassung vorhanden.'}
              </p>
            </div>

            <div className="pt-4">
              <h4 className="mb-4 text-center font-medium">Ihre Entscheidung</h4>
              <ApprovalActions id={ref.id} token={token} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
