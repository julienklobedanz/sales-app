import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Globe, MapPinIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import type { CompanyDetailCompany } from './company-detail-types'
import { ROUTES } from '@/lib/routes'
import { COPY } from '@/lib/copy'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { CompanyLogo } from '@/components/ui/company-logo'

export function CompanyDetailHeader({
  company,
  canEdit,
  onEditClick,
}: {
  company: CompanyDetailCompany
  canEdit?: boolean
  onEditClick?: () => void
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <CompanyLogo
          src={company.logo_url}
          containerClassName="size-14 rounded-2xl"
          imageClassName="object-contain p-2"
          fallbackIconSize={28}
        />
        <div className="min-w-0">
          <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} truncate`}>{company.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {company.industry && (
              <span className="inline-flex items-center gap-1">
                <AppIcon icon={Building2} size={14} />
                {company.industry}
              </span>
            )}
            {company.headquarters && (
              <span className="inline-flex items-center gap-1">
                <AppIcon icon={MapPinIcon} size={14} />
                {company.headquarters}
              </span>
            )}
            {company.website_url && (
              <a
                className="inline-flex items-center gap-1 hover:underline"
                href={
                  company.website_url.startsWith('http')
                    ? company.website_url
                    : `https://${company.website_url}`
                }
                target="_blank"
                rel="noreferrer"
              >
                <AppIcon icon={Globe} size={14} />
                Website
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canEdit && onEditClick ? (
          <Button type="button" variant="secondary" onClick={onEditClick}>
            {COPY.accounts.editButton}
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={ROUTES.accounts}>Zurück</Link>
        </Button>
      </div>
    </div>
  )
}
