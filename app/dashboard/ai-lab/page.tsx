import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AiLabPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          RFP-Analyzer und weitere KI-Tools – in Kürze verfügbar.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-12 text-center text-muted-foreground">
        <p className="text-sm">Hier leben zukünftig der RFP-Analyzer und andere KI-Features.</p>
      </div>
    </div>
  )
}
