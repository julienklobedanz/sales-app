'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Building2 } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

type CompanyLogoProps = {
  src?: string | null
  alt?: string
  containerClassName?: string
  imageClassName?: string
  fallbackIconSize?: number
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

      if (luminance > 224 && saturation < 0.18) {
        whiteLike += 1
      }
    }

    if (!opaque) return false
    return whiteLike / opaque > 0.58
  } catch {
    return false
  }
}

export function CompanyLogo({
  src,
  alt = '',
  containerClassName,
  imageClassName,
  fallbackIconSize = 24,
}: CompanyLogoProps) {
  const [darkBackground, setDarkBackground] = useState(false)

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setDarkBackground(shouldUseDarkBackground(event.currentTarget))
  }, [])

  if (!src) {
    return (
      <div className={cn('flex items-center justify-center border bg-muted', containerClassName)}>
        <AppIcon icon={Building2} size={fallbackIconSize} className="text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden border bg-muted transition-colors',
        darkBackground && 'border-slate-700 bg-slate-900',
        containerClassName
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        onLoad={handleImageLoad}
        className={cn('object-contain p-1.5', imageClassName)}
        sizes="56px"
      />
    </div>
  )
}
