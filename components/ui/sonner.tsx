'use client'

import {
  CancelCircleIcon,
  CircleCheck,
  CircleAlert,
  InformationCircleIcon,
  Loader,
} from '@hugeicons/core-free-icons'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { AppIcon } from '@/lib/icons'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <AppIcon icon={CircleCheck} size={16} />,
        info: <AppIcon icon={InformationCircleIcon} size={16} />,
        warning: <AppIcon icon={CircleAlert} size={16} />,
        error: <AppIcon icon={CancelCircleIcon} size={16} />,
        loading: <AppIcon icon={Loader} size={16} className="animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
