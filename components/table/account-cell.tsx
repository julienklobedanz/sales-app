"use client"

import { CompanyLogo } from "@/components/ui/company-logo"

export function AccountCell({
  companyName,
  companyLogoUrl,
  companyId,
}: {
  companyName: string | null | undefined
  companyLogoUrl: string | null | undefined
  companyId?: string | null
}) {
  return (
    <div className="flex min-w-0 max-w-[260px] items-center gap-2.5">
      <CompanyLogo
        src={companyLogoUrl}
        companyId={companyId}
        fallbackText={companyName}
        containerClassName="h-9 w-9 shrink-0 rounded-md"
        fallbackIconSize={18}
        imageClassName="p-0.5"
      />
      <span className="truncate font-semibold text-foreground">{companyName ?? "Kein Account"}</span>
    </div>
  )
}
