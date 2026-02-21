import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { completeOnboarding } from './actions'
import {
  CheckCircle2,
  BriefcaseIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function OnboardingPage({ searchParams }: Props) {
  const params = await searchParams
  const inviteToken = params.invite?.trim() || null

  let inviteOrganizationName: string | null = null
  if (inviteToken) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.rpc('get_invite_by_token', {
      invite_token: inviteToken,
    })
    const parsed = data as { organization_name?: string } | null
    if (parsed?.organization_name) {
      inviteOrganizationName = parsed.organization_name
    }
  }

  const isInvite = Boolean(inviteToken && inviteOrganizationName)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <BriefcaseIcon className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">
            {isInvite ? 'Team beitreten' : 'Willkommen bei Refstack'}
          </CardTitle>
          <CardDescription>
            {isInvite
              ? `Du trittst „${inviteOrganizationName}“ bei. Vervollständige dein Profil.`
              : 'Bitte vervollständige dein Profil, damit wir die Ansicht für dich anpassen können.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={completeOnboarding} className="space-y-6">
            {inviteToken ? (
              <input type="hidden" name="invite_token" value={inviteToken} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="full_name">Dein vollständiger Name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Max Mustermann"
                required
              />
            </div>

            {!isInvite && (
            <div className="space-y-2">
              <Label htmlFor="organization_name">Firmenname (deine Organisation)</Label>
              <Input
                id="organization_name"
                name="organization_name"
                placeholder="Mein Unternehmen"
              />
              <p className="text-muted-foreground text-xs">
                Alle Daten (Referenzen, Kontakte) werden dieser Firma zugeordnet. Teammitglieder derselben Firma sehen dieselben Daten.
              </p>
            </div>
            )}

            <div className="space-y-2">
              <Label>Deine Rolle im Unternehmen</Label>
              <div className="grid grid-cols-1 gap-4 pt-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="sales"
                    className="peer sr-only"
                    required
                  />
                  <div className="border-muted bg-popover hover:bg-accent peer-checked:border-primary peer-checked:bg-primary/5 rounded-lg border-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BriefcaseIcon className="text-muted-foreground size-5" />
                        <div className="font-medium">Sales Representative</div>
                      </div>
                      <CheckCircle2 className="text-primary size-5 opacity-0 peer-checked:opacity-100" />
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Finden & Anfragen: Referenzen suchen und Freigaben anfragen.
                    </p>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    className="peer sr-only"
                  />
                  <div className="border-muted bg-popover hover:bg-accent peer-checked:border-primary peer-checked:bg-primary/5 rounded-lg border-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="text-muted-foreground size-5" />
                        <div className="font-medium">Marketing / Bid Manager</div>
                      </div>
                      <CheckCircle2 className="text-primary size-5 opacity-0 peer-checked:opacity-100" />
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Verwalten & Veröffentlichen: Inhalte pflegen, PDFs hochladen und Freigaben steuern.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Loslegen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
