'use client'

import * as React from 'react'
import { Eye, EyeOff } from '@hugeicons/core-free-icons'

import { Input } from '@/components/ui/input'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

function PasswordInput({
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = React.useState(false)
  const [hasValue, setHasValue] = React.useState(
    () => String(value ?? defaultValue ?? '').length > 0,
  )

  React.useEffect(() => {
    if (value === undefined) return
    const next = String(value).length > 0
    setHasValue(next)
    if (!next) setVisible(false)
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value.length > 0
    setHasValue(next)
    if (!next) setVisible(false)
    onChange?.(e)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(hasValue && 'pr-10', className)}
      />
      {hasValue ? (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          aria-pressed={visible}
        >
          <AppIcon icon={visible ? EyeOff : Eye} size={16} />
        </button>
      ) : null}
    </div>
  )
}

export { PasswordInput }
