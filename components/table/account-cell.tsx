"use client"

import { CompanyLogo } from "@/components/ui/company-logo"

export function AccountCell({
  companyName,
  companyLogoUrl,
  companyId,
  nameMaxWidthClass = 'max-w-[260px]',
}: {
  companyName: string | null | undefined
  companyLogoUrl: string | null | undefined
  companyId?: string | null
  nameMaxWidthClass?: string
}) {
  const label = companyName ?? 'Kein Account'
  return (
    <div className="flex h-9 min-w-0 items-center gap-2.5">
      <CompanyLogo
        src={companyLogoUrl}
        companyId={companyId}
        fallbackText={companyName}
        containerClassName="size-9 shrink-0 rounded-md"
        fallbackIconSize={18}
        imageClassName="p-0.5"
      />
      <span
        className={`truncate text-sm font-semibold leading-none text-foreground ${nameMaxWidthClass}`}
        title={companyName ?? undefined}
      >
        {label}
      </span>
    </div>
  )
}
