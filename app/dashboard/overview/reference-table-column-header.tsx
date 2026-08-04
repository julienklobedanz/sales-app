"use client"

import type * as React from "react"

import type {
  ReferenceColumnKey,
  ReferenceTableHeaderRenderContext,
} from "./reference-table-column-types"
import {
  renderCompanyHeader,
  renderCountryHeader,
  renderIndustryHeader,
  renderTagsHeader,
  renderTitleHeader,
} from "./reference-table-column-header-identity"
import {
  renderProjectStatusHeader,
  renderStatusHeader,
} from "./reference-table-column-header-status"
import { renderVolumeHeader } from "./reference-table-column-header-volume"
import {
  isDateColumn,
  renderDateColumnHeader,
} from "./reference-table-column-header-dates"

export function renderReferenceColumnHeader(
  column: ReferenceColumnKey,
  ctx: ReferenceTableHeaderRenderContext
): React.ReactNode {
  switch (column) {
    case "company":
      return renderCompanyHeader(ctx)
    case "title":
      return renderTitleHeader(ctx)
    case "volume_eur":
      return renderVolumeHeader(ctx)
    case "industry":
      return renderIndustryHeader(ctx)
    case "status":
      return renderStatusHeader(ctx)
    case "project_status":
      return renderProjectStatusHeader(ctx)
    case "tags":
      return renderTagsHeader(ctx)
    case "country":
      return renderCountryHeader(ctx)
    default:
      if (isDateColumn(column)) {
        return renderDateColumnHeader(column, ctx)
      }
      return null
  }
}
