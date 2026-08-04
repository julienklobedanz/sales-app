'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Building2 } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { requestCompanyBrandfetchRetry } from '@/lib/accounts/company-brandfetch-retry-client'
import { refreshCompanyBrandfetchOnLogoIssue } from '@/lib/references/library/sync-company-brandfetch'
import { rewriteBrandfetchLogoUrlForLightBackground } from '@/lib/brandfetch/logo-theme-url'

/** Layout-Anker für geladene Logos — ohne sichtbaren Kasten (Fallback behält eigenen Rahmen). */
export const COMPANY_LOGO_CONTAINER_CLASS = 'relative overflow-hidden'

type CompanyLogoProps = {
  src?: string | null
  alt?: string
  fallbackText?: string | null
  containerClassName?: string
  imageClassName?: string
  fallbackIconSize?: number
  /** Bei fehlendem/defektem Logo: Brandfetch-Nachzug (Logo + HQ, Website, Mitarbeiter, Branche). */
  companyId?: string | null
}

function LogoFallback({
  fallbackText,
  containerClassName,
  fallbackIconSize = 24,
}: Pick<CompanyLogoProps, 'fallbackText' | 'containerClassName' | 'fallbackIconSize'>) {
  const initials = String(fallbackText ?? '')
    .split(/\s+/)
    .map((chunk) => chunk.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={cn(
        'flex items-center justify-center border border-border/50 bg-gradient-to-br from-blue-500/90 to-violet-500/85 text-white',
        containerClassName,
      )}
    >
      {initials ? (
        <span className="text-sm font-semibold tracking-wide">{initials}</span>
      ) : (
        <AppIcon icon={Building2} size={fallbackIconSize} className="text-white/90" />
      )}
    </div>
  )
}

export function CompanyLogo({
  src: srcProp,
  alt = '',
  fallbackText,
  containerClassName,
  imageClassName,
  fallbackIconSize = 24,
  companyId,
}: CompanyLogoProps) {
  const router = useRouter()
  const [localSrc, setLocalSrc] = useState<string | null>(() => {
    const raw = String(srcProp ?? '').trim() || null
    return raw ? (rewriteBrandfetchLogoUrlForLightBackground(raw) ?? raw) : null
  })
  const [imageFailed, setImageFailed] = useState(false)
  const mountedRetry = useRef(false)

  useEffect(() => {
    const nextRaw = String(srcProp ?? '').trim() || null
    const next = nextRaw
      ? (rewriteBrandfetchLogoUrlForLightBackground(nextRaw) ?? nextRaw)
      : null
    queueMicrotask(() => {
      setLocalSrc(next)
      setImageFailed(false)
      mountedRetry.current = false
    })
  }, [srcProp, companyId])

  const runBrandfetchRetry = useCallback(
    (failedLogoUrl: string | null) => {
      const id = String(companyId ?? '').trim()
      if (!id) return

      void requestCompanyBrandfetchRetry(id, failedLogoUrl, (cid, failed) =>
        refreshCompanyBrandfetchOnLogoIssue(cid, failed),
      ).then((result) => {
        if (result?.logo_url) {
          const rewritten =
            rewriteBrandfetchLogoUrlForLightBackground(result.logo_url) ?? result.logo_url
          setLocalSrc(rewritten)
          setImageFailed(false)
        }
        if (result) router.refresh()
      })
    },
    [companyId, router],
  )

  useEffect(() => {
    const id = String(companyId ?? '').trim()
    if (!id || mountedRetry.current) return
    if (localSrc && !imageFailed) return

    mountedRetry.current = true
    runBrandfetchRetry(localSrc)
  }, [companyId, localSrc, imageFailed, runBrandfetchRetry])

  const handleImageLoad = useCallback(() => {
    setImageFailed(false)
  }, [])

  const handleImageError = useCallback(() => {
    const failed = localSrc
    setImageFailed(true)
    runBrandfetchRetry(failed)
  }, [localSrc, runBrandfetchRetry])

  const showImage = Boolean(localSrc) && !imageFailed

  if (!showImage) {
    return (
      <LogoFallback
        fallbackText={fallbackText}
        containerClassName={containerClassName}
        fallbackIconSize={fallbackIconSize}
      />
    )
  }

  return (
    <div className={cn(COMPANY_LOGO_CONTAINER_CLASS, containerClassName)}>
      <Image
        src={localSrc!}
        alt={alt}
        fill
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn('object-contain', imageClassName)}
        sizes="56px"
      />
    </div>
  )
}
