'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Building2 } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { requestCompanyBrandfetchRetry } from '@/lib/accounts/company-brandfetch-retry-client'
import { refreshCompanyBrandfetchOnLogoIssue } from '@/app/dashboard/references/sync-company-brandfetch'

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

function shouldUseDarkBackground(image: HTMLImageElement): boolean {
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) return false

  const sample = 32
  const canvas = document.createElement('canvas')
  canvas.width = sample
  canvas.height = sample
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return false

  try {
    context.clearRect(0, 0, sample, sample)
    context.drawImage(image, 0, 0, sample, sample)
    const pixels = context.getImageData(0, 0, sample, sample).data

    let opaque = 0
    let whiteLike = 0

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] ?? 0
      const g = pixels[i + 1] ?? 0
      const b = pixels[i + 2] ?? 0
      const a = pixels[i + 3] ?? 0

      if (a < 28) continue
      opaque += 1

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const saturation = max === 0 ? 0 : (max - min) / max

      if (luminance > 236 && saturation < 0.12) {
        whiteLike += 1
      }
    }

    if (opaque < 40) return false
    return whiteLike / opaque > 0.82
  } catch {
    return false
  }
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
        'flex items-center justify-center border bg-gradient-to-br from-blue-500/90 to-violet-500/85 text-white',
        containerClassName
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
  const [localSrc, setLocalSrc] = useState<string | null>(() => String(srcProp ?? '').trim() || null)
  const [imageFailed, setImageFailed] = useState(false)
  const [darkBackground, setDarkBackground] = useState(false)
  const mountedRetry = useRef(false)

  useEffect(() => {
    const next = String(srcProp ?? '').trim() || null
    setLocalSrc(next)
    setImageFailed(false)
    mountedRetry.current = false
  }, [srcProp, companyId])

  const runBrandfetchRetry = useCallback(
    (failedLogoUrl: string | null) => {
      const id = String(companyId ?? '').trim()
      if (!id) return

      void requestCompanyBrandfetchRetry(id, failedLogoUrl, (cid, failed) =>
        refreshCompanyBrandfetchOnLogoIssue(cid, failed)
      ).then((result) => {
        if (result?.logo_url) {
          setLocalSrc(result.logo_url)
          setImageFailed(false)
        }
        if (result) router.refresh()
      })
    },
    [companyId, router]
  )

  useEffect(() => {
    const id = String(companyId ?? '').trim()
    if (!id || mountedRetry.current) return
    if (localSrc && !imageFailed) return

    mountedRetry.current = true
    runBrandfetchRetry(localSrc)
  }, [companyId, localSrc, imageFailed, runBrandfetchRetry])

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setImageFailed(false)
    setDarkBackground(shouldUseDarkBackground(event.currentTarget))
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
    <div
      className={cn(
        'relative overflow-hidden border bg-muted transition-colors',
        darkBackground &&
          'border-slate-800/60 bg-gradient-to-b from-slate-800 via-[#172033] to-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        containerClassName
      )}
    >
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
