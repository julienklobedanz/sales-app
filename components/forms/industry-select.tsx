'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MASTER_INDUSTRIES, resolveIndustryId } from '@/lib/constants/industries'
import { cn } from '@/lib/utils'

type IndustrySelectProps = {
  id?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function IndustrySelect({
  id,
  value,
  onValueChange,
  disabled = false,
  className,
  placeholder = 'Auswählen …',
}: IndustrySelectProps) {
  const resolved = resolveIndustryId(value) || undefined

  return (
    <Select value={resolved} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {MASTER_INDUSTRIES.map((industry) => (
          <SelectItem key={industry.id} value={industry.id}>
            {industry.labelDe}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
