import Link from 'next/link'
import { CheckListIcon } from '@hugeicons/core-free-icons'

import { Card, CardContent } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'

export function SubmissionWorkspaceTile({
  href,
  state,
}: {
  href: string
  state: string | null
}) {
  return (
    <Card className="p-0">
      <Link href={href} className="block h-full rounded-lg focus-visible:outline-none">
        <CardContent className="flex h-full flex-col gap-2 p-4">
          <AppIcon icon={CheckListIcon} size={18} className="text-muted-foreground" />
          <p className="text-sm font-semibold">
            {COPY.deals.cockpit.submissionWorkspaceTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {COPY.deals.cockpit.submissionWorkspaceTilePurpose}
          </p>
          {state ? (
            <p className="mt-auto text-sm font-medium tabular-nums">{state}</p>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  )
}
