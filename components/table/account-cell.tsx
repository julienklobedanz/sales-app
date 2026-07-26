import { CompanyLogo } from "@/components/ui/company-logo"
import { rewriteBrandfetchLogoUrlForLightBackground } from '@/lib/brandfetch/logo-theme-url'
import { cn } from '@/lib/utils'

export function AccountCell({
  companyName,
  companyLogoUrl,
  companyId,
  className,
}: {
  companyName: string | null | undefined
  companyLogoUrl: string | null | undefined
  companyId?: string | null
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
      <span
        className="min-w-0 flex-1 truncate text-sm font-semibold leading-normal text-foreground"
        title={companyName ?? undefined}
      >
        {label}
      </span>
    </div>
  )
}
