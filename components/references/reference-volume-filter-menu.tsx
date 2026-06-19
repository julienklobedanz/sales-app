'use client'

import { FilterMenuCheckboxOption } from '@/components/table/filter-menu-checkbox-option'
import {
  REFERENCE_VOLUME_FILTER_OPTIONS,
  type ReferenceVolumeFilter,
} from '@/lib/references/reference-volume-filter'

export function ReferenceVolumeFilterMenu({
  value,
  onChange,
}: {
  value: ReferenceVolumeFilter
  onChange: (value: ReferenceVolumeFilter) => void
}) {
  return (
    <div className="max-h-56 space-y-0 overflow-y-auto text-sm">
      {REFERENCE_VOLUME_FILTER_OPTIONS.map((opt) => (
        <FilterMenuCheckboxOption
          key={opt.value}
          label={opt.label}
          selected={value === opt.value}
          onSelect={() => onChange(opt.value)}
        />
      ))}
    </div>
  )
}
