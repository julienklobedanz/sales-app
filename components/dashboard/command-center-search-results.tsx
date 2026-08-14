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
  'text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-2 bg-muted/50 border-b border-border first:border-t-0'

const ITEM_CLASS =
  'flex cursor-pointer items-center justify-between gap-3 rounded-none px-4 py-2.5 text-sm text-foreground aria-selected:bg-muted aria-selected:text-foreground data-[selected=true]:bg-muted'

type Props = {
  query: string
  loading: boolean
  groups: CommandSearchGroups
  onSelect: (item: CommandSearchResult) => void
  /** Ohne eigenen Command/CommandList-Wrapper (z. B. in der Sidebar-Command-Palette). */
  embedded?: boolean
}

export function CommandCenterSearchResults({
  query,
  loading,
  groups,
  onSelect,
  embedded = false,
}: Props) {
  const trimmed = query.trim()
  const showEmpty = !loading && trimmed.length > 0 && !hasAnyCommandSearchHit(groups)

  const groupBlocks = !loading
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
    : null

  if (embedded) {
    return <>{groupBlocks}</>
  }

  return (
    <Command shouldFilter={false} className="rounded-none bg-transparent">
      <CommandList className="max-h-[min(420px,55vh)] scroll-py-0">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Suche läuft…
          </div>
        ) : null}

        {showEmpty ? (
          <CommandEmpty className="px-4 py-10 text-center text-sm text-muted-foreground">
            Noch keine Treffer für „{trimmed}“ gefunden. Versuche es mit einem anderen
            Begriff.
          </CommandEmpty>
        ) : null}

        {groupBlocks}
      </CommandList>
    </Command>
  )
}

export function SearchResultRow({ item }: { item: CommandSearchResult }) {
  switch (item.kind) {
    case 'account':
    case 'partner':
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
            <span className="truncate font-semibold text-foreground">{item.title}</span>
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
              <span className="font-medium text-foreground">{item.title}</span>
              {item.customerName ? (
                <span className="text-muted-foreground"> · {item.customerName}</span>
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
              <span className="text-muted-foreground">{item.statusLine}</span>
              <span className="font-medium text-foreground">
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
              <span className="font-medium text-foreground">{item.title}</span>
              {item.accountName ? (
                <span className="text-muted-foreground"> — {item.accountName}</span>
              ) : item.industry ? (
                <span className="text-muted-foreground">
                  {' '}
                  ({formatIndustryDisplay(item.industry)})
                </span>
              ) : null}
            </span>
          </span>
          {typeof item.similarity === 'number' && item.similarity > 0 ? (
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] font-medium tabular-nums"
            >
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
              <TrendingUp className="size-4 text-primary" aria-hidden />
            </ResultIconWrap>
            <span className="min-w-0 truncate font-medium text-foreground">
              {item.title}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{item.companyName}</span>
        </>
      )
    case 'contact_external': {
      const subtitle = [item.role, item.companyName].filter(Boolean).join(', ')
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <AvatarInitials name={item.name} />
            <span className="min-w-0 truncate">
              <span className="font-medium text-foreground">{item.name}</span>
              {subtitle ? <span className="text-muted-foreground"> ({subtitle})</span> : null}
            </span>
          </span>
          <AppIcon
            icon={Linkedin01Icon}
            size={16}
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </>
      )
    }
    case 'contact_internal':
      return (
        <>
          <span className="flex min-w-0 items-center gap-3">
            <AvatarInitials name={item.name} />
            <span className="min-w-0 truncate">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="text-muted-foreground"> ({item.roleLabel})</span>
            </span>
          </span>
          <Badge
            variant="outline"
            className="shrink-0 border-primary/30 bg-primary/10 text-[10px] font-medium text-primary"
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
            <span className="min-w-0 truncate font-medium text-foreground">
              {item.title}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{item.validUntilLine}</span>
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
              <span className="font-medium text-foreground">{item.fileName}</span>
              <span className="text-muted-foreground">
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
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">
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
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground"
      aria-hidden
    >
      {initials}
    </span>
  )
}

export { formatReferenceListLabel }
