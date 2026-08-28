export type FactRow = {
  key: string
  label: string
  value: string
}

export function FactsDl({
  rows,
  className = 'grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2',
}: {
  rows: FactRow[]
  className?: string
}) {
  return (
    <dl className={className}>
      {rows.map((row) => (
        <div key={row.key} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm font-medium leading-snug">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
