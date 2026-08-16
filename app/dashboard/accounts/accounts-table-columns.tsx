import type { ColumnDef } from '@tanstack/react-table'
import { CompanyLogo } from '@/components/ui/company-logo'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { NdaStatusBadge } from './components/nda-status-badge'
import type { CompanyCard } from './accounts-grid-types'

export function buildAccountsTableColumns(): ColumnDef<CompanyCard>[] {
  return [
    {
      id: 'company',
      accessorKey: 'name',
      header: 'Firma',
      cell: ({ row }) => {
        const company = row.original
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyLogo
              src={company.logo_url}
              companyId={company.id}
              fallbackText={company.name}
              containerClassName="size-8 shrink-0 rounded-md"
              fallbackIconSize={16}
            />
            <span className="truncate font-medium">{company.name}</span>
          </div>
        )
      },
    },
    {
      id: 'proofs',
      accessorFn: (row) => row.reference_count ?? 0,
      header: 'Beweise',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{String(getValue<number>())}</span>
      ),
    },
    {
      id: 'deals',
      accessorFn: (row) => row.open_deals_count ?? 0,
      header: 'Offene Deals',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{String(getValue<number>())}</span>
      ),
    },
    {
      id: 'nda',
      accessorFn: (row) => row.nda_status ?? 'none',
      header: 'NDA',
      cell: ({ row }) => (
        <NdaStatusBadge status={row.original.nda_status ?? 'none'} compact />
      ),
    },
    {
      id: 'industry',
      accessorFn: (row) => row.industry ?? '',
      header: 'Branche',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.industry ? formatIndustryDisplay(row.original.industry) : '—'}
        </span>
      ),
    },
    {
      id: 'headquarters',
      accessorFn: (row) => row.headquarters ?? '',
      header: 'Standort',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.headquarters || '—'}</span>
      ),
    },
  ]
}
