import Link from 'next/link'

import { AccountCell } from '@/components/table/account-cell'
import { ROUTES } from '@/lib/routes'

type Props = {
  companyId?: string | null
  companyName?: string | null
  companyLogoUrl?: string | null
}

export function TableAccountLinkContent({
  companyId,
  companyName,
  companyLogoUrl,
}: Props) {
  const accountCell = (
    <AccountCell
      companyName={companyName}
      companyId={companyId}
      companyLogoUrl={companyLogoUrl}
    />
  )

  if (!companyId) {
    return accountCell
  }

  return (
    <Link
      href={ROUTES.accountsDetail(companyId)}
      onClick={(e) => e.stopPropagation()}
      className="flex w-full min-w-0 max-w-full items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${companyName ?? 'Account'} öffnen`}
    >
      {accountCell}
    </Link>
  )
}
