import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { User, Shield, Save } from 'lucide-react'
import { updateProfile } from './actions'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihr Profil und Ihre Account-Präferenzen.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SettingsForm
          userEmail={user.email ?? ''}
          fullName={profile?.full_name ?? ''}
          role={profile?.role ?? 'sales'}
        />
      </div>
    </div>
  )
}
