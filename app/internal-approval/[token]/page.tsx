import Link from 'next/link'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { confirmInternalApprovalFromToken } from '@/lib/references/complete-internal-approval'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'

export const metadata = {
  robots: 'noindex, nofollow',
}

export default async function InternalApprovalConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createServiceRoleSupabaseClient()

  if (!admin) {
    return (
      <InvalidCard
        title="Konfiguration fehlt"
        description="Der Freigabe-Link kann derzeit nicht verarbeitet werden. Bitte wenden Sie sich an Ihren Administrator."
      />
    )
  }

  const result = await confirmInternalApprovalFromToken(admin, token)

  if (!result.ok) {
    return (
      <InvalidCard
        title="Link ungültig"
        description="Dieser interne Freigabe-Link ist abgelaufen oder wurde bereits verwendet."
      />
    )
  }

  const detailHref = ROUTES.evidence.detail(result.referenceId)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <CardTitle className="text-xl">
            {result.alreadyApproved ? 'Bereits intern freigegeben' : 'Interne Freigabe bestätigt'}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {result.alreadyApproved
              ? `Die Referenz „${result.referenceTitle}“ war bereits intern freigegeben. Sie können nun die Kundenfreigabe vorbereiten.`
              : `Die Referenz „${result.referenceTitle}“ ist intern freigegeben. Als Nächstes können Sie in RefStack die Kundenfreigabe vorbereiten und den Link an den Kunden senden.`}
          </CardDescription>
          <Button asChild className="w-full">
            <Link href={detailHref}>Zur Referenz in RefStack</Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}

function InvalidCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
