import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, Building2, Globe, MapPinIcon, Pencil, Users } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import type { CompanyDetailCompany } from './company-detail-types'
import { formatEmployeeCountDeDisplay } from '@/lib/format'
import { accountsListHref } from '@/lib/accounts/accounts-list-view'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { CompanyLogo } from '@/components/ui/company-logo'
import { CompanyDetailNdaPopover } from './components/company-detail-nda-popover'
import type { NdaAgreementRow } from './nda-actions'

export function CompanyDetailHeader({
  company,
  canEdit,
  onEditClick,
  ndaAgreements,
  openNdaOnMount = false,
}: {
  company: CompanyDetailCompany
  canEdit?: boolean
  onEditClick?: () => void
  ndaAgreements: NdaAgreementRow[]
  openNdaOnMount?: boolean
}) {
  const employeeLabel =
    typeof company.employee_count === 'number' && Number.isFinite(company.employee_count)
      ? formatEmployeeCountDeDisplay(company.employee_count)
      : null

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <CompanyLogo
          src={company.logo_url}
          companyId={company.id}
          fallbackText={company.name}
          containerClassName="size-14 rounded-2xl"
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
            {employeeLabel && (
              <span className="inline-flex items-center gap-1">
                <AppIcon icon={Users} size={14} />
                {employeeLabel} Mitarbeiter
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
        <CompanyDetailNdaPopover
          companyId={company.id}
          companyName={company.name}
          initialAgreements={ndaAgreements}
          canManage={Boolean(canEdit)}
          openOnMount={openNdaOnMount}
        />
        {canEdit && onEditClick ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={onEditClick}
            aria-label="Bearbeiten"
            title="Bearbeiten"
          >
            <AppIcon icon={Pencil} size={16} />
          </Button>
        ) : null}
        <Button asChild variant="outline" size="icon" className="size-9 shrink-0">
          <Link
            href={accountsListHref(company.entity_kind === 'partner' ? 'partner' : 'account')}
            aria-label="Zurück zur Übersicht"
            title="Zurück"
          >
            <AppIcon icon={ArrowLeftIcon} size={16} />
          </Link>
        </Button>
      </div>
    </div>
  )
}
