import Link from 'next/link'
import type { ReactNode } from 'react'

import { Card, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getInternalApprovalPageContext } from '@/lib/references/internal-approval-context'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { ROUTES } from '@/lib/routes'

import { InternalApprovalForm } from './internal-approval-form'

export const dynamic = 'force-dynamic'

export const metadata = {
  robots: 'noindex, nofollow',
}

export default async function InternalApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  // Service-Role weil: Seitenkontext für tokenisierten internen Freigabe-Link ohne Login.
  // Grenze: getInternalApprovalPageContext filtert auf approval_internal_review_token.
  const admin = createServiceRoleSupabaseClient()

  if (!admin) {
    return (
      <InvalidCard
        title="Konfiguration fehlt"
        description="Der Freigabe-Link kann derzeit nicht verarbeitet werden. Bitte wenden Sie sich an Ihren Administrator."
      />
    )
  }

  const context = await getInternalApprovalPageContext(admin, token)

  if (!context.success) {
    return (
      <InvalidCard
        title="Link ungültig"
        description="Dieser interne Freigabe-Link ist abgelaufen oder wurde bereits verwendet."
      />
    )
  }

  const detailHref = ROUTES.references.detail(context.referenceId)

  if (context.alreadyApproved) {
    return (
      <TokenPageFrame title="Bereits intern freigegeben" cardClassName="w-full text-center">
        <CardHeader className="space-y-4">
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            Die Referenz „{context.referenceTitle}“ war bereits intern freigegeben. Sie
            können nun die Kundenfreigabe in RefStack vorbereiten.
          </CardDescription>
          <Button asChild className="w-full">
            <Link href={detailHref}>Zur Referenz in RefStack</Link>
          </Button>
        </CardHeader>
      </TokenPageFrame>
    )
  }

  return (
    <TokenPageFrame title="Interne Freigabe">
      <CardHeader className="space-y-4">
        <CardDescription className="text-center text-sm leading-relaxed">
          Bitte bestätigen Sie die interne Freigabe oder delegieren Sie sie an eine
          andere Person. Die Kundenmail geht danach nicht automatisch raus.
        </CardDescription>
        <InternalApprovalForm
          token={token}
          referenceId={context.referenceId}
          referenceTitle={context.referenceTitle}
          accountCompanyName={context.accountCompanyName}
          requesterName={context.requesterName}
          message={context.message}
          coordinatorEmail={context.coordinatorEmail}
        />
      </CardHeader>
    </TokenPageFrame>
  )
}

function TokenPageFrame({
  title,
  children,
  cardClassName,
}: {
  title: string
  children: ReactNode
  cardClassName?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <Card className={cardClassName}>{children}</Card>
      </div>
    </div>
  )
}

function InvalidCard({ title, description }: { title: string; description: string }) {
  return (
    <TokenPageFrame title={title} cardClassName="w-full text-center">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </TokenPageFrame>
  )
}
