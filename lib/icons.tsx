import * as React from 'react'

import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'

export type AppIconProps = Omit<
  React.ComponentProps<typeof HugeiconsIcon>,
  'icon' | 'color' | 'size' | 'strokeWidth'
> & {
  icon: IconSvgElement
  size?: number | string
  strokeWidth?: number
}

/**
 * Zentrale Icon-Komponente, damit wir Icon-Library/Defaults an einem Ort steuern können.
 */
export function AppIcon({ icon, size = 20, strokeWidth = 1.75, ...props }: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      {...props}
    />
  )
}

