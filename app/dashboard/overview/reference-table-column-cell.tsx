"use client"

import type * as React from "react"

import { TableDataCell } from "@/components/table/table-row-align"
import { ReferenceStatusBadge } from "@/components/reference-status-badge"
import { TableAccountLinkContent } from "@/components/table/table-account-link-content"
import { TableTitleHoverContent } from "@/components/table/table-title-hover-content"
import {
  formatReferenceDate,
  formatReferenceVolumeCompact,
  normalizeOrgDateDisplayFormat,
} from "@/lib/format"
import { formatIndustryDisplay } from "@/lib/constants/industries"
import { ROUTES } from "@/lib/routes"

import type { ReferenceRow } from "../actions"
import {
  type ReferenceColumnKey,
  type ReferenceTableCellRenderContext,
} from "./reference-table-column-types"
import { columnWidthStyle } from "./reference-table-column-shared"

export function renderReferenceColumnCell(
  column: ReferenceColumnKey,
  ref: ReferenceRow,
  ctx: ReferenceTableCellRenderContext
): React.ReactNode {
  const { PROJECT_STATUS_LABELS, companyLogoById, companyIndustryById, columnWidths } = ctx
  const dateFmt = normalizeOrgDateDisplayFormat(ctx.orgDateDisplayFormat)
  const widthStyle = columnWidthStyle(columnWidths[column])
  switch (column) {
    case "company":
      return (
        <TableDataCell className="min-w-0 overflow-hidden" style={widthStyle}>
          <TableAccountLinkContent
            companyId={ref.company_id}
            companyName={ref.company_name}
            companyLogoUrl={companyLogoById.get(ref.company_id) ?? ref.company_logo_url ?? null}
          />
        </TableDataCell>
      )
    case "title": {
      const summaryText = String(ref.summary ?? "").trim()
      return (
        <TableDataCell className="min-w-0" style={widthStyle}>
          <TableTitleHoverContent
            title={ref.title}
            href={ROUTES.references.detail(ref.id)}
            previewLabel="Projekt-Zusammenfassung"
            previewText={summaryText}
            emptyPreviewText="Noch keine Kurz-Zusammenfassung hinterlegt. Sie wird beim Anlegen der Referenz automatisch ergänzt, sobald ausreichend Kontext vorliegt — oder kann in der Referenz bearbeitet werden."
          />
        </TableDataCell>
      )
    }
    case "industry": {
      const industryRaw =
        String(ref.industry ?? '').trim() ||
        companyIndustryById.get(ref.company_id) ||
        ''
      const industryLabel = formatIndustryDisplay(industryRaw)
      return (
        <TableDataCell className="min-w-0 overflow-hidden text-muted-foreground" style={widthStyle}>
          <span className="block min-w-0 truncate leading-normal" title={industryLabel || undefined}>
            {industryLabel}
          </span>
        </TableDataCell>
      )
    }
    case "volume_eur":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm tabular-nums"
          alignClassName="justify-end"
          style={widthStyle}
        >
          <span className="leading-none">
            {formatReferenceVolumeCompact(ref.volume_eur) || ''}
          </span>
        </TableDataCell>
      )
    case "status":
      return (
        <TableDataCell style={widthStyle}>
          <ReferenceStatusBadge
            status={ref.status}
            customerApprovalStatus={ref.customer_approval_status}
            approvalScopeNamedMention={ref.approval_scope_named_mention}
            approvalScopeAnonymousMention={ref.approval_scope_anonymous_mention}
          />
        </TableDataCell>
      )
    case "project_status":
      return (
        <TableDataCell className="text-sm text-muted-foreground" style={widthStyle}>
          <span className="leading-none">
            {ref.project_status
              ? PROJECT_STATUS_LABELS[ref.project_status] ?? ref.project_status
              : ''}
          </span>
        </TableDataCell>
      )
    case "updated_at":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
          style={widthStyle}
        >
          <span className="leading-none">
            {ref.updated_at ? formatReferenceDate(ref.updated_at, dateFmt) : ''}
          </span>
        </TableDataCell>
      )
    case "tags":
      return (
        <TableDataCell style={widthStyle}>
          {ref.tags ? (
            <div className="flex flex-wrap gap-1">
              {ref.tags
                .split(/[\s,]+/)
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 3)
                .map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          ) : null}
        </TableDataCell>
      )
    case "country":
      return (
        <TableDataCell className="text-muted-foreground" style={widthStyle}>
          <span className="leading-none">{ref.country ?? ''}</span>
        </TableDataCell>
      )
    case "project_start":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
          style={widthStyle}
        >
          <span className="leading-none">
            {ref.project_start ? formatReferenceDate(ref.project_start, dateFmt) : ''}
          </span>
        </TableDataCell>
      )
    case "project_end":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
          style={widthStyle}
        >
          <span className="leading-none">
            {ref.project_end ? formatReferenceDate(ref.project_end, dateFmt) : ''}
          </span>
        </TableDataCell>
      )
    case "duration_months":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
          style={widthStyle}
        >
          <span className="leading-none">
            {ref.duration_months != null ? `${ref.duration_months}` : ''}
          </span>
        </TableDataCell>
      )
    case "created_at":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
          style={widthStyle}
        >
          <span className="leading-none">{formatReferenceDate(ref.created_at, dateFmt)}</span>
        </TableDataCell>
      )
    default:
      return null
  }
}
