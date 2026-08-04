import { CompanyLogo } from '@/components/ui/company-logo'
import Link from 'next/link'
import { rewriteBrandfetchLogoUrlForLightBackground } from '@/lib/brandfetch/logo-theme-url'
import { cn } from '@/lib/utils'

export function AccountCell({
  companyName,
  companyLogoUrl,
  companyId,
  accountNameHref,
  className,
}: {
  companyName: string | null | undefined
  companyLogoUrl: string | null | undefined
  companyId?: string | null
  /**
   * Wenn gesetzt: nur der Account-Name (Text) navigiert, nicht die ganze Zelle.
   * Damit verhindert ihr „Hintergrund klickt Account“.
   */
  accountNameHref?: string | null
  className?: string
}) {
  const label = companyName ?? 'Kein Account'
  return (
    <div className={cn('flex w-full min-h-9 min-w-0 items-center gap-2.5', className)}>
      <CompanyLogo
        src={rewriteBrandfetchLogoUrlForLightBackground(companyLogoUrl) ?? companyLogoUrl}
        companyId={companyId}
        fallbackText={companyName}
        containerClassName="size-9 shrink-0 rounded-md"
        fallbackIconSize={18}
      />
      {/*
        Restbreite der Zelle bleibt unclickable (min-w-0 flex-1 Wrapper).
        Der Link ist nur so breit wie der sichtbare Name — kein Hover/Klick im „Hintergrund“.
      */}
      <div className="min-w-0 flex-1">
        {accountNameHref ? (
          <Link
            href={accountNameHref}
            onClick={(e) => e.stopPropagation()}
            className="inline-block max-w-full truncate text-sm font-semibold leading-normal text-foreground no-underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            title={companyName ?? undefined}
            aria-label={`${companyName ?? 'Account'} öffnen`}
          >
            {label}
          </Link>
        ) : (
          <span
            className="inline-block max-w-full truncate text-sm font-semibold leading-normal text-foreground"
            title={companyName ?? undefined}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
