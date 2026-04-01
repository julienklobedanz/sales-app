'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { Resend } from 'resend'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function submitForApprovalImpl(id: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const newToken = crypto.randomUUID()

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(`
      title,
      contact_id,
      companies ( name ),
      contact_persons!references_contact_id_fkey ( email, first_name )
    `)
    .eq('id', id)
    .single()

  if (fetchError || !row) throw new Error('Referenz nicht gefunden')

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? (row.companies[0] as { name?: string })
      : (row.companies as { name?: string } | null)
  const company_name = company?.name ?? 'Referenz'

  const { error: updateError } = await supabase
    .from('references')
    .update({
      status: 'pending',
      approval_token: newToken,
    })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)

  const { data: existing } = await supabase
    .from('approvals')
    .select('id')
    .eq('reference_id', id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!existing) {
    await supabase.from('approvals').insert({
      reference_id: id,
      requester_id: user.id,
      status: 'pending',
    })
  }

  const contactPerson = Array.isArray(row.contact_persons)
    ? row.contact_persons[0]
    : row.contact_persons
  const contact = contactPerson as { email?: string; first_name?: string } | null
  const contactEmail =
    typeof contact?.email === 'string' && contact.email.includes('@')
      ? contact.email
      : null

  const resend = getResend()
  if (contactEmail && resend) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const firstName = contact?.first_name ?? ''
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: contactEmail,
        subject: `Freigabe erforderlich: ${company_name}`,
        html: `
          <h1>Hallo${firstName ? ` ${firstName}` : ''}!</h1>
          <p>Für das Unternehmen <strong>${company_name}</strong> wurde eine neue Referenz erstellt:</p>
          <p><em>"${row.title}"</em></p>
          <p>Bitte klicken Sie auf den folgenden Link, um die Details zu prüfen und die Freigabestufe festzulegen:</p>
          <a href="${baseUrl}/approval/${newToken}" 
             style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Jetzt prüfen & freigeben
          </a>
        `,
      })
    } catch (e) {
      console.error('E-Mail-Versand fehlgeschlagen:', e)
    }
  }

  revalidatePath(ROUTES.home)
}

