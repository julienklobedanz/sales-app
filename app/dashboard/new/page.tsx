import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReferenceForm } from './reference-form'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'

export default async function NewReferencePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 1. Firmen laden
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  // 2. Kontaktpersonen laden
  const { data: contacts } = await supabase
    .from('contact_persons')
    .select('*')
    .order('last_name')

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeftIcon className="size-4" />
            Zurück zum Dashboard
          </Button>
        </Link>
        <ReferenceForm
          companies={companies ?? []}
          contacts={contacts ?? []}
        />
      </div>
    </div>
  )
}
