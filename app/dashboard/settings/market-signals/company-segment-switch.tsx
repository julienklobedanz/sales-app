'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type CompanyWatchSegment = 'all' | 'neu' | 'bestand'

type Props = {
  value: CompanyWatchSegment
  onChange: (value: CompanyWatchSegment) => void
}

const SEGMENTS: { value: CompanyWatchSegment; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'neu', label: 'Neukunden' },
  { value: 'bestand', label: 'Bestand' },
]

/** Segment-Chips für die Watchlist: Alle | Neukunden | Bestand. */
export function CompanySegmentSwitch({ value, onChange }: Props) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as CompanyWatchSegment)}
    >
      <TabsList aria-label="Account-Segment">
        {SEGMENTS.map((segment) => (
          <TabsTrigger key={segment.value} value={segment.value}>
            {segment.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
