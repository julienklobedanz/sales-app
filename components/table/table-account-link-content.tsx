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
  return (
    <AccountCell
      companyName={companyName}
      companyId={companyId}
      companyLogoUrl={companyLogoUrl}
      accountNameHref={companyId ? ROUTES.accountsDetail(companyId) : null}
    />
  )
}
