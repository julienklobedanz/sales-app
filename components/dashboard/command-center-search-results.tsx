'use client'

import { Linkedin01Icon } from '@hugeicons/core-free-icons'
import { FileText, Folder, Loader2, ShieldCheck, TrendingUp, Trophy } from 'lucide-react'

import { ComplianceDocumentTypeIcon } from '@/app/dashboard/overview/compliance-document-type-icon'
import { AppIcon } from '@/lib/icons'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { CompanyLogo } from '@/components/ui/company-logo'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import {
  COMMAND_SEARCH_GROUP_LABELS,
  COMMAND_SEARCH_GROUP_ORDER,
  formatReferenceListLabel,
  hasAnyCommandSearchHit,
  type CommandSearchGroups,
  type CommandSearchResult,
} from '@/lib/command-center/global-search'

const GROUP_HEADING_CLASS =
  'text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2 bg-slate-50/50 border-b border-slate-100 first:border-t-0'

const ITEM_CLASS =
  'flex cursor-pointer items-center justify-between gap-3 rounded-none px-4 py-2.5 text-sm text-slate-700 aria-selected:bg-slate-50 aria-selected:text-slate-900 data-[selected=true]:bg-slate-50'

type Props = {
  query: string
  loading: boolean
  groups: CommandSearchGroups
  onSelect: (item: CommandSearchResult) => void
}

export function CommandCenterSearchResults({ query, loading, groups, onSelect }: Props) {
  const trimmed = query.trim()
  const showEmpty = !loading && trimmed.length > 0 && !hasAnyCommandSearchHit(groups)

  return (
    <Command shouldFilter={false} className="rounded-none bg-transparent">
      <CommandList className="max-h-[min(420px,55vh)] scroll-py-0">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Suche läuft…
          </div>
        ) : null}

        {showEmpty ? (
          <CommandEmpty className="px-4 py-10 text-center text-sm text-slate-500">
            Noch keine Treffer für „{trimmed}“ gefunden. Versuche es mit einem anderen Begriff.
          </CommandEmpty>
        ) : null}

        {!loading
          ? COMMAND_SEARCH_GROUP_ORDER.map((key) => {
              const items = groups[key]
              if (!items.length) return null
              return (
                <CommandGroup
                  key={key}
                  heading={COMMAND_SEARCH_GROUP_LABELS[key]}
                  className="overflow-hidden p-0 [&_[cmdk-group-heading]]:hidden"
                >
                  <p className={GROUP_HEADING_CLASS}>{COMMAND_SEARCH_GROUP_LABELS[key]}</p>
                  {items.map((item) => (
                    <CommandItem
                      key={`${item.kind}:${item.id}`}
                      value={`${item.kind}-${item.id}`}
                      onSelect={() => onSelect(item)}
                      className={ITEM_CLASS}
                    >
                      <SearchResultRow item={item} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })
          : null}
      </CommandList>
    </Command>
  )
}

export function SearchResultRow({ item }: { item: CommandSearchResult }) {
  switch (item.kind) {
    case 'account':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <CompanyLogo
              src={item.logoUrl}
              companyId={item.id}
              fallbackText={item.title}
              containerClassName="size-8 shrink-0 rounded-lg"
              fallbackIconSize={14}
            />
            <span className="truncate font-semibold text-slate-900">{item.title}</span>
          </span>
        </>
      )
    case 'rfp':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <ResultIconWrap>
              <Folder className="size-4" aria-hidden />
            </ResultIconWrap>
            <span className="min-w-0 truncate">
              <span className="font-medium text-slate-900">{item.title}</span>
              {item.customerName ? (
                <span className="text-slate-500"> · {item.customerName}</span>
              ) : null}
            </span>
          </span>
          <Badge variant="secondary" className="shrink-0 text-[10px] font-medium">
            {item.statusLabel}
          </Badge>
        </>
      )
    case 'nda':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <ResultIconWrap>
              <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
            </ResultIconWrap>
            <span className="min-w-0 truncate text-left">
              <span className="text-slate-600">{item.statusLine}</span>
              <span className="font-medium text-slate-900">
                {' '}
                — {item.title}
                {item.companyName ? ` (${item.companyName})` : ''}
              </span>
            </span>
          </span>
        </>
      )
    case 'reference':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <ResultIconWrap>
              <Trophy className="size-4 text-amber-600" aria-hidden />
            </ResultIconWrap>
            <span className="min-w-0 truncate">
              <span className="font-medium text-slate-900">{item.title}</span>
              {item.accountName ? (
                <span className="text-slate-500"> — {item.accountName}</span>
              ) : item.industry ? (
                <span className="text-slate-500"> ({formatIndustryDisplay(item.industry)})</span>
              ) : null}
            </span>
          </span>
          {typeof item.similarity === 'number' && item.similarity > 0 ? (
            <Badge variant="secondary" className="shrink-0 text-[10px] font-medium tabular-nums">
              {Math.round(item.similarity * 100)} %
            </Badge>
          ) : null}
        </>
      )
    case 'market_signal':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <ResultIconWrap>
              <TrendingUp className="size-4 text-violet-600" aria-hidden />
            </ResultIconWrap>
            <span className="min-w-0 truncate font-medium text-slate-900">{item.title}</span>
          </span>
          <span className="shrink-0 text-xs text-slate-400">{item.companyName}</span>
        </>
      )
    case 'contact_external': {
      const subtitle = [item.role, item.companyName].filter(Boolean).join(', ')
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <AvatarInitials name={item.name} />
            <span className="min-w-0 truncate">
              <span className="font-medium text-slate-900">{item.name}</span>
              {subtitle ? <span className="text-slate-500"> ({subtitle})</span> : null}
            </span>
          </span>
          <AppIcon icon={Linkedin01Icon} size={16} className="size-4 shrink-0 text-slate-400" aria-hidden />
        </>
      )
    }
    case 'contact_internal':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <AvatarInitials name={item.name} />
            <span className="min-w-0 truncate">
              <span className="font-medium text-slate-900">{item.name}</span>
              <span className="text-slate-500"> ({item.roleLabel})</span>
            </span>
          </span>
          <Badge
            variant="outline"
            className="shrink-0 border-violet-200 bg-violet-50 text-[10px] font-medium text-violet-800"
          >
            Kollege für Warm-Intro
          </Badge>
        </>
      )
    case 'certificate':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <ComplianceDocumentTypeIcon
              documentType={item.documentType}
              title={item.title}
              className="size-8"
            />
            <span className="min-w-0 truncate font-medium text-slate-900">{item.title}</span>
          </span>
          <span className="shrink-0 text-xs text-slate-500">{item.validUntilLine}</span>
        </>
      )
    case 'reference_document':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <ResultIconWrap>
              <FileText className="size-4 text-sky-600" aria-hidden />
            </ResultIconWrap>
            <span className="min-w-0 truncate text-left">
              <span className="font-medium text-slate-900">{item.fileName}</span>
              <span className="text-slate-500">
                {' '}
                — {item.referenceTitle}
                {item.companyName ? ` (${item.companyName})` : ''}
              </span>
            </span>
          </span>
        </>
      )
    default:
      return null
  }
}

function ResultIconWrap({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
      {children}
    </span>
  )
}

function AvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
      : (parts[0]?.slice(0, 2) ?? '?').toUpperCase()
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
      aria-hidden
    >
      {initials}
    </span>
  )
}

export { formatReferenceListLabel }
