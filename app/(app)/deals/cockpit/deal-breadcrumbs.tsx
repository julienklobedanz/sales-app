import Link from 'next/link'

export type DealBreadcrumbItem = {
  label: string
  href?: string
}

export function DealBreadcrumbs({ items }: { items: DealBreadcrumbItem[] }) {
  return (
    <nav className="text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}:${item.href ?? ''}`}>
          {index > 0 ? <span className="px-2">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
