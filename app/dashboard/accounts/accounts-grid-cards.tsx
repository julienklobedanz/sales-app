'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Cancel01Icon,
  Building2,
  Globe,
  MapPinIcon,
  Pencil,
  StarIcon,
  Users,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { CompanyLogo } from '@/components/ui/company-logo'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { COPY } from '@/lib/copy'
import { partnerCategoryLabel } from '@/lib/accounts/account-entity'
import { NdaStatusBadge } from './components/nda-status-badge'
import { AccountStatusPicker } from './components/account-status-picker'
import type { AccountCardPrimaryAction } from '@/lib/accounts/account-card-primary-action'
import { AccountsToolbarTooltip } from './components/accounts-toolbar-tooltip'
import { companyHref, employeeLabel } from './accounts-grid-filters'
import type { CompanyCard } from './accounts-grid-types'

function primaryLineClass(primary: AccountCardPrimaryAction): string {
  // Fallback/Signal = Meta-Stil wie Secondary (AT&T); Risk-Zeilen etwas größer, aber nicht fett.
  if (primary.kind === 'fallback' || primary.kind === 'signal') {
    return 'line-clamp-2 text-xs font-normal leading-snug text-muted-foreground'
  }
  if (primary.tone === 'danger') {
    return 'line-clamp-2 text-sm font-normal leading-snug text-red-600/80 dark:text-red-400/75'
  }
  if (primary.tone === 'warning') {
    return 'line-clamp-2 text-sm font-normal leading-snug text-amber-700/85 dark:text-amber-400/80'
  }
  return 'line-clamp-2 text-xs font-normal leading-snug text-muted-foreground'
}

function AccountCardBody({
  company,
  canManage,
  favoriteSaving,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  company: CompanyCard
  canManage: boolean
  favoriteSaving: boolean
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const primary = company.primary_action
  const secondary = (company.secondary_meta ?? '').trim()
  return (
    <div className="flex min-h-[132px] flex-col p-3.5">
      <div className="flex items-start gap-2.5">
        <CompanyLogo
          src={company.logo_url}
          companyId={company.id}
          alt={company.name}
          containerClassName="size-10 shrink-0 rounded-xl"
          fallbackIconSize={20}
          fallbackText={company.name}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <CardTitle className="truncate text-left text-base font-semibold leading-tight">
            {company.name}
          </CardTitle>
          {primary ? <p className={primaryLineClass(primary)}>{primary.label}</p> : null}
          {secondary ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{secondary}</p>
          ) : (
            <p className="text-xs text-transparent">—</p>
          )}
        </div>
        <div className="relative -mt-0.5 shrink-0">
          <AccountStatusPicker
            companyId={company.id}
            status={company.account_status ?? null}
            canManage={canManage}
          />
          {canManage ? (
            <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
              <AccountsToolbarTooltip
                label={
                  company.is_favorite
                    ? 'Aus Favoriten entfernen'
                    : 'Zu Favoriten hinzufügen'
                }
              >
                <button
                  type="button"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-sm hover:bg-muted/70"
                  aria-label={
                    company.is_favorite
                      ? 'Aus Favoriten entfernen'
                      : 'Zu Favoriten hinzufügen'
                  }
                  disabled={favoriteSaving}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite()
                  }}
                >
                  <AppIcon
                    icon={StarIcon}
                    size={12}
                    className={
                      company.is_favorite
                        ? 'text-amber-500 dark:text-amber-400 [&_path]:fill-current'
                        : 'text-muted-foreground'
                    }
                  />
                </button>
              </AccountsToolbarTooltip>
              <AccountsToolbarTooltip label="Bearbeiten">
                <button
                  type="button"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-sm hover:bg-muted/70"
                  aria-label="Account bearbeiten"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                >
                  <AppIcon icon={Pencil} size={12} />
                </button>
              </AccountsToolbarTooltip>
              <AccountsToolbarTooltip label="Löschen">
                <button
                  type="button"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                  aria-label="Account löschen"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <AppIcon icon={Cancel01Icon} size={12} />
                </button>
              </AccountsToolbarTooltip>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PartnerCardBody({ company }: { company: CompanyCard }) {
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CompanyLogo
              src={company.logo_url}
              companyId={company.id}
              alt={company.name}
              containerClassName="size-12 shrink-0 rounded-2xl"
              fallbackIconSize={24}
              fallbackText={company.name}
            />
            <div className="flex min-w-0 flex-1 flex-col items-start text-left">
              <CardTitle className="w-full truncate text-left text-base font-semibold">
                {company.name}
              </CardTitle>
              <div className="mt-0.5 w-full text-left">
                <NdaStatusBadge status={company.nda_status ?? 'none'} compact subtle />
              </div>
              {company.linked_account_name ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {COPY.accounts.alsoLinkedAccountHint}
                  {company.linked_account_name ? `: ${company.linked_account_name}` : ''}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          {partnerCategoryLabel(company.partner_category) ? (
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Users} size={14} className="shrink-0" />
              <span className="max-w-[150px] truncate">
                {partnerCategoryLabel(company.partner_category)}
              </span>
            </div>
          ) : null}
          {company.industry && (
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Building2} size={14} className="shrink-0" />
              <span className="max-w-[150px] truncate">
                {formatIndustryDisplay(company.industry)}
              </span>
            </div>
          )}
          {employeeLabel(company.employee_count) && (
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Users} size={14} className="shrink-0" />
              <span className="max-w-[160px] truncate">
                {employeeLabel(company.employee_count)}
              </span>
            </div>
          )}
          {company.headquarters && (
            <div className="flex items-center gap-1.5">
              <AppIcon icon={MapPinIcon} size={14} className="shrink-0" />
              <span className="max-w-[140px] truncate">{company.headquarters}</span>
            </div>
          )}
          {company.website_url && (
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Globe} size={14} className="shrink-0" />
              <a
                href={
                  company.website_url.startsWith('http')
                    ? company.website_url
                    : `https://${company.website_url}`
                }
                target="_blank"
                rel="noreferrer"
                className="max-w-[160px] truncate text-muted-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Website
              </a>
            </div>
          )}
        </div>
      </CardContent>
      <CardContent className="pt-2 pb-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <AppIcon icon={Users} size={14} />
          <span>
            {company.reference_count ?? 0}{' '}
            {(company.reference_count ?? 0) === 1 ? 'Referenz' : 'Referenzen'}
          </span>
        </div>
      </CardContent>
    </>
  )
}

export function AccountGridCard({
  company,
  isPartnerView,
  canManage,
  favoriteSaving,
  deleting,
  onOpen,
  onEdit,
  onToggleFavorite,
  onRequestDelete,
}: {
  company: CompanyCard
  isPartnerView: boolean
  canManage: boolean
  favoriteSaving: boolean
  deleting: boolean
  onOpen: () => void
  onEdit: () => void
  onToggleFavorite: () => void
  onRequestDelete: () => void
}) {
  const href = companyHref(company.id, isPartnerView)
  const editHref = companyHref(company.id, isPartnerView, { edit: true })

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card className="group relative h-full overflow-visible rounded-3xl border border-border/60 bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md">
          {canManage && isPartnerView ? (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <AccountsToolbarTooltip
                label={
                  company.is_favorite
                    ? 'Aus Favoriten entfernen'
                    : 'Zu Favoriten hinzufügen'
                }
              >
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-sm hover:bg-muted/70 hover:text-foreground"
                  aria-label={
                    company.is_favorite
                      ? 'Aus Favoriten entfernen'
                      : 'Zu Favoriten hinzufügen'
                  }
                  disabled={favoriteSaving}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite()
                  }}
                >
                  <AppIcon
                    icon={StarIcon}
                    size={14}
                    className={
                      company.is_favorite
                        ? 'text-amber-500 dark:text-amber-400 [&_path]:fill-current'
                        : 'text-muted-foreground'
                    }
                  />
                </button>
              </AccountsToolbarTooltip>
              <AccountsToolbarTooltip label="Bearbeiten">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-sm hover:bg-muted/70 hover:text-foreground"
                  aria-label="Account bearbeiten"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                >
                  <AppIcon icon={Pencil} size={14} />
                </button>
              </AccountsToolbarTooltip>
              <AccountsToolbarTooltip label="Löschen">
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                  aria-label="Account löschen"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (deleting) return
                    onRequestDelete()
                  }}
                >
                  <AppIcon icon={Cancel01Icon} size={14} />
                </button>
              </AccountsToolbarTooltip>
            </div>
          ) : null}
          <div
            role="link"
            tabIndex={0}
            className="block h-full cursor-pointer transition-opacity duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={onOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen()
              }
            }}
          >
            {isPartnerView ? (
              <PartnerCardBody company={company} />
            ) : (
              <AccountCardBody
                company={company}
                canManage={canManage}
                favoriteSaving={favoriteSaving}
                onToggleFavorite={onToggleFavorite}
                onEdit={onEdit}
                onDelete={() => {
                  if (deleting) return
                  onRequestDelete()
                }}
              />
            )}
          </div>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem asChild>
          <Link href={href}>Öffnen</Link>
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onToggleFavorite()
          }}
        >
          {company.is_favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        </ContextMenuItem>

        {canManage ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem asChild>
              <Link href={editHref}>Bearbeiten</Link>
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                if (deleting) return
                onRequestDelete()
              }}
            >
              Löschen
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}
