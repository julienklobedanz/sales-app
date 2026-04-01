import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReferenceForm } from './reference-form'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export const maxDuration = 60

export default async function NewReferencePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)
  const role = (profile as { role?: 'admin' | 'sales' | 'account_manager' }).role ?? 'sales'
  if (role === 'sales') redirect(ROUTES.evidence.root)

  // 1. Firmen laden (inkl. logo_url für Anzeige bei Auswahl)
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .order('name')

  // 2. Kontaktpersonen (interne) laden
  const { data: contacts } = await supabase
    .from('contact_persons')
    .select('*')
    .order('last_name')

  // 3. Externe Kontakte (Kundenansprechpartner) laden – Formular filtert nach company_id
  const { data: externalContacts } = await supabase
    .from('external_contacts')
    .select('id, company_id, first_name, last_name, email, role')
    .eq('organization_id', (profile as { organization_id?: string | null })?.organization_id ?? '')
    .order('last_name')

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href={ROUTES.evidence.root}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <AppIcon icon={ArrowLeftIcon} size={16} />
            Zurück zu {COPY.nav.evidence}
          </Button>
        </Link>
        <ReferenceForm
          companies={companies ?? []}
          contacts={contacts ?? []}
          externalContacts={externalContacts ?? []}
        />
      </div>
    </div>
  )
}
