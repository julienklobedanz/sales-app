'use client'

import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPinIcon,
  Phone,
  Timer,
  UserIcon,
  Users,
} from '@hugeicons/core-free-icons'

import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import {
  diffMonthsUtc,
  formatNumberDe,
  formatReferenceDate,
  formatReferenceVolume,
  type OrgDateDisplayFormat,
} from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { AppIcon } from '@/lib/icons'

import type { ReferenceRow } from '../../actions'

export type ReferenceDetailExternalContact = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone?: string | null
}

export function ReferenceDetailProjectCard({
  selectedRef,
  externalContacts,
  dateFmt,
}: {
  selectedRef: ReferenceRow
  externalContacts: ReferenceDetailExternalContact[]
  dateFmt: OrgDateDisplayFormat
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Projektdetails
          </span>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={FileText} size={12} /> Volumen
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.volume_eur ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {selectedRef.volume_eur
                  ? formatReferenceVolume(selectedRef.volume_eur)
                  : '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={FileText} size={12} /> Vertragsart
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.contract_type ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {formatContractTypeDisplay(selectedRef.contract_type) || '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={Calendar} size={12} /> Projektstart
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.project_start ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {selectedRef.project_start
                  ? formatReferenceDate(selectedRef.project_start, dateFmt)
                  : '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={Timer} size={12} /> Projektende / Dauer
              </span>
              {(() => {
                const start = selectedRef.project_start
                const end = selectedRef.project_end
                const status = selectedRef.project_status
                const label =
                  status === 'active'
                    ? 'Aktiv'
                    : end
                      ? formatReferenceDate(end, dateFmt)
                      : '—'
                const nowIso = new Date().toISOString()
                const duration =
                  selectedRef.duration_months != null
                    ? selectedRef.duration_months
                    : start && end
                      ? diffMonthsUtc(start, end)
                      : status === 'active' && start
                        ? diffMonthsUtc(start, nowIso)
                        : null
                return (
                  <p className="pl-4 text-xs font-medium text-foreground">
                    {duration != null ? `${label} (${duration} Monate)` : label}
                  </p>
                )
              })()}
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={Building2} size={12} /> Aktueller Dienstleister
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.incumbent_provider ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {selectedRef.incumbent_provider || '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={Users} size={12} /> Beteiligte Wettbewerber
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.competitors ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {selectedRef.competitors || '—'}
              </p>
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Unternehmensdetails
          </span>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={Building2} size={12} /> Industrie
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.industry ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {formatIndustryDisplay(selectedRef.industry) || '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={MapPinIcon} size={12} /> HQ
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.country ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {selectedRef.country || '—'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={Globe} size={12} /> Website
              </span>
              <div className="pl-4">
                {selectedRef.website ? (
                  <a
                    href={selectedRef.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-medium"
                  >
                    Öffnen <AppIcon icon={ExternalLink} size={12} />
                  </a>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">—</p>
                )}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={UserIcon} size={12} /> Mitarbeiter
              </span>
              <p
                className={`pl-4 text-xs font-medium ${selectedRef.employee_count != null ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {formatNumberDe(selectedRef.employee_count)}
              </p>
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Kontakte
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={UserIcon} size={12} /> Interner Ansprechpartner
              </span>
              <p className="pl-4 text-xs font-medium">
                {selectedRef.contact_display ||
                  selectedRef.contact_email ||
                  'Nicht zugewiesen'}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-4">
                {selectedRef.contact_email && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={`mailto:${selectedRef.contact_email}`}
                        className="inline-flex items-center gap-1 text-[10px] hover:underline"
                      >
                        <AppIcon icon={Mail} size={14} />
                        {selectedRef.contact_email}
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>E-Mail: {selectedRef.contact_email}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-muted-foreground pl-4 text-[10px]">Account Owner</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <AppIcon icon={UserIcon} size={12} /> Kundenansprechpartner
              </span>
              {(() => {
                const ext = selectedRef.customer_contact_id
                  ? externalContacts?.find((c) => c.id === selectedRef.customer_contact_id)
                  : undefined
                const displayName =
                  selectedRef.customer_contact ||
                  (ext
                    ? [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                    : null) ||
                  '—'
                const email = ext?.email ?? null
                const phone = ext?.phone ?? null
                const role = ext?.role ?? null
                return (
                  <>
                    <p
                      className={`pl-4 text-xs font-medium ${displayName !== '—' ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {displayName}
                    </p>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-4">
                      {email && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={`mailto:${email}`}
                              className="inline-flex items-center gap-1 text-[10px] hover:underline"
                            >
                              <AppIcon icon={Mail} size={14} />
                              {email}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>E-Mail: {email}</TooltipContent>
                        </Tooltip>
                      )}
                      {phone && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={`tel:${phone}`}
                              className="inline-flex items-center gap-1 text-[10px] hover:underline"
                            >
                              <AppIcon icon={Phone} size={14} />
                              {phone}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>Telefon: {phone}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {role && (
                      <p className="text-muted-foreground pl-4 text-[10px]">{role}</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
