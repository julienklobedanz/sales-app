import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthPageUser } from '@/lib/supabase/safe-auth'
import { ROUTES } from '@/lib/routes'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const user = await getAuthPageUser(supabase)

  redirect(user ? ROUTES.home : ROUTES.login)
}
