import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe, MapPinIcon, StarIcon, Users } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { ReferenceStatusWithHint } from '@/components/reference-status-with-hint'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { toggleFavorite } from '@/app/dashboard/actions'

type ReferenceDetailHeaderProps = {
  title: string
  status: string
  customerApprovalStatus: string | null
  approvalInternalStatus: string | null
  approvalRequestedAt: string | null
  approvalScopeNamedMention: boolean | null
  approvalScopeAnonymousMention: boolean | null
  headerCompany: string | null
  companyId: string | null | undefined
  isAnonymizedView: boolean
  industryLabel: string | null
  employeeMetaLabel: string | null
  locationMetaLabel: string | null
  websiteMetaHref: string | null
  tags: string[]
  isFavorited?: boolean
  favoriteReferenceId?: string
}

export function ReferenceDetailHeader({
  title,
  status,
  customerApprovalStatus,
  approvalInternalStatus,
  approvalRequestedAt,
  approvalScopeNamedMention,
  approvalScopeAnonymousMention,
  headerCompany,
  companyId,
  isAnonymizedView,
  industryLabel,
  employeeMetaLabel,
  locationMetaLabel,
  websiteMetaHref,
  tags,
  isFavorited = false,
  favoriteReferenceId,
}: ReferenceDetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ReferenceStatusWithHint
            status={status}
            customerApprovalStatus={customerApprovalStatus}
            approvalInternalStatus={approvalInternalStatus}
            approvalRequestedAt={approvalRequestedAt}
            approvalScopeNamedMention={approvalScopeNamedMention}
            approvalScopeAnonymousMention={approvalScopeAnonymousMention}
          />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <h2 className={`${DASHBOARD_PAGE_TITLE_CLASS} min-w-0 break-words`}>{title}</h2>
          {favoriteReferenceId ? (
            <form action={toggleFavorite.bind(null, favoriteReferenceId)}>
              <button
                type="submit"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={isFavorited ? 'Favorit entfernen' : 'Favorisieren'}
              >
                <AppIcon
                  icon={StarIcon}
                  size={16}
                  className={isFavorited ? 'text-foreground' : 'opacity-80'}
                />
              </button>
            </form>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {headerCompany ? (
            isAnonymizedView || !companyId ? (
              <span className="inline-flex max-w-[min(100%,240px)] shrink-0 items-center font-medium text-foreground/90">
                {headerCompany}
              </span>
            ) : (
              <span className="inline-flex max-w-[min(100%,240px)] shrink-0 items-center font-medium text-foreground/90">
                <Link
                  href={ROUTES.accountsDetail(companyId)}
                  className="truncate transition-colors hover:text-foreground hover:underline"
                >
                  {headerCompany}
                </Link>
              </span>
            )
          ) : null}
          {industryLabel ? (
            <span className="inline-flex max-w-[min(100%,280px)] items-center gap-1">
              <AppIcon icon={Building2} size={14} className="shrink-0" />
              <span className="truncate">{industryLabel}</span>
            </span>
          ) : null}
          {employeeMetaLabel ? (
            <span className="inline-flex shrink-0 items-center gap-1">
              <AppIcon icon={Users} size={14} />
              {employeeMetaLabel} Mitarbeiter
            </span>
          ) : null}
          {locationMetaLabel ? (
            <span className="inline-flex max-w-[min(100%,260px)] items-center gap-1">
              <AppIcon icon={MapPinIcon} size={14} className="shrink-0" />
              <span className="truncate">{locationMetaLabel}</span>
            </span>
          ) : null}
          {websiteMetaHref ? (
            <a
              className="inline-flex shrink-0 items-center gap-1 hover:underline"
              href={websiteMetaHref}
              target="_blank"
              rel="noreferrer"
            >
              <AppIcon icon={Globe} size={14} />
              Website
            </a>
          ) : null}
        </div>
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
