import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getRequests } from '../actions'
import { RequestsList } from './requests-list'
import { FileStack, Inbox } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const requests = await getRequests()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? 'Eingehende Anfragen' : 'Meine Freigabe-Anträge'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Offene Anträge von Sales Reps zur Prüfung.'
              : 'Übersicht deiner beantragten Freigaben.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5">
          {isAdmin ? (
            <Inbox className="h-4 w-4" />
          ) : (
            <FileStack className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{requests.length} Einträge</span>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Keine Einträge vorhanden.</p>
        </div>
      ) : (
        <RequestsList requests={requests} isAdmin={isAdmin} />
      )}
    </div>
  )
}
