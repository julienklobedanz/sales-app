'use client'

import type * as React from 'react'

import { DraggableColumnHead } from '@/components/table/draggable-column-head'
import { getIndustryLabelDe } from '@/lib/constants/industries'

import type { ReferenceTableHeaderRenderContext } from './reference-table-column-types'
import {
  buildHeaderDragProps,
  ColumnSortButton,
  SearchableRadioFilterHeader,
} from './reference-table-column-header-shared'

export function renderCompanyHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('company', ctx)}>
      <SearchableRadioFilterHeader
        label={ctx.COLUMN_LABELS.company}
        filterValue={ctx.companyFilter}
        setFilter={ctx.setCompanyFilter}
        search={ctx.companySearch}
        setSearch={ctx.setCompanySearch}
        searchPlaceholder="Unternehmen suchen…"
        options={ctx.filterOptions.companies}
        sortColumn="company"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
        sortActivePrimary
      />
    </DraggableColumnHead>
  )
}

export function renderTitleHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('title', ctx)}>
      <ColumnSortButton
        column="title"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
        label={ctx.COLUMN_LABELS.title}
        activePrimary
      />
    </DraggableColumnHead>
  )
}

export function renderIndustryHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('industry', ctx)}>
      <SearchableRadioFilterHeader
        label={ctx.COLUMN_LABELS.industry}
        filterValue={ctx.industryFilter}
        setFilter={ctx.setIndustryFilter}
        search={ctx.industrySearch}
        setSearch={ctx.setIndustrySearch}
        searchPlaceholder="Industrie suchen…"
        options={ctx.filterOptions.industries}
        getLabel={getIndustryLabelDe}
        sortColumn="industry"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
      />
    </DraggableColumnHead>
  )
}

export function renderCountryHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('country', ctx)}>
      <SearchableRadioFilterHeader
        label={ctx.COLUMN_LABELS.country}
        filterValue={ctx.countryFilter}
        setFilter={ctx.setCountryFilter}
        search={ctx.countrySearch}
        setSearch={ctx.setCountrySearch}
        searchPlaceholder="HQ suchen…"
        options={ctx.filterOptions.countries}
        popoverClassName="w-56"
        sortColumn="country"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
      />
    </DraggableColumnHead>
  )
}

export function renderTagsHeader(
  ctx: ReferenceTableHeaderRenderContext,
): React.ReactNode {
  return (
    <DraggableColumnHead {...buildHeaderDragProps('tags', ctx)}>
      <SearchableRadioFilterHeader
        label={ctx.COLUMN_LABELS.tags}
        filterValue={ctx.tagsFilter}
        setFilter={ctx.setTagsFilter}
        search={ctx.tagsSearch}
        setSearch={ctx.setTagsSearch}
        searchPlaceholder="Tags suchen…"
        options={ctx.filterOptions.tags}
        sortColumn="tags"
        sortKey={ctx.sortKey}
        sortDir={ctx.sortDir}
        handleSort={ctx.handleSort}
        sortActivePrimary
      />
    </DraggableColumnHead>
  )
}
