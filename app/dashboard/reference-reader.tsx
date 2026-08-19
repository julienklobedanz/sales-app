'use client'

import { Building2 } from '@hugeicons/core-free-icons'
import type { ReferenceRow } from './actions'
import { AppIcon } from '@/lib/icons'
import { CompanyLogo } from '@/components/ui/company-logo'
import { Card, CardTitle } from '@/components/ui/card'
import { ReferenceContentCore } from '@/components/references/reference-content-core'

export function ReferenceReader({ reference }: { reference: ReferenceRow }) {
  const isAnonymized = reference.status === 'anonymized'
  const companyDisplay = isAnonymized ? 'Anonymisierter Kunde' : reference.company_name

  return (
    <Card className="w-full p-6 text-foreground">
      <div className="flex items-start gap-3">
        {isAnonymized ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 bg-muted/50">
            <AppIcon icon={Building2} size={24} className="text-muted-foreground" />
          </div>
        ) : (
          <CompanyLogo
            src={reference.company_logo_url}
            companyId={reference.company_id}
            fallbackText={reference.company_name}
            containerClassName="h-12 w-12 rounded-xl"
            fallbackIconSize={24}
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {companyDisplay}
          </p>
          <CardTitle className="mt-1 text-xl leading-tight tracking-tight md:text-2xl">
            {reference.title}
          </CardTitle>
        </div>
      </div>

      <div className="mt-4">
        <ReferenceContentCore
          surface="reduced"
          summary={reference.summary}
          challenge={reference.customer_challenge}
          solution={reference.our_solution}
        />
      </div>
    </Card>
  )
}
