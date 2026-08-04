import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatReferenceDate,
  formatReferenceVolume,
  type OrgDateDisplayFormat,
} from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'

export type ReferenceDetailProjectCardProps = {
  isSalesView: boolean
  volumeEur: string | null
  contractType: string | null
  projectStart: string | null
  projectEnd: string | null
  projectStatus: string | null
  orgDateFmt: OrgDateDisplayFormat
  incumbentProvider: string | null
  competitors: string | null
}

export function ReferenceDetailProjectCard({
  isSalesView,
  volumeEur,
  contractType,
  projectStart,
  projectEnd,
  projectStatus,
  orgDateFmt,
  incumbentProvider,
  competitors,
}: ReferenceDetailProjectCardProps) {
  return (
    <Card className={isSalesView ? 'order-1' : 'order-1'}>
      <CardHeader>
        <CardTitle className="text-base">Projektdetails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Volumen</span>
          <span className="font-medium tabular-nums">
            {formatReferenceVolume(volumeEur)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Vertragsart</span>
          <span className="font-medium">{formatContractTypeDisplay(contractType)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Projektstart</span>
          <span className="font-medium">
            {projectStart ? formatReferenceDate(projectStart, orgDateFmt) : ''}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Projektende</span>
          <span className="font-medium text-right">
            {projectEnd
              ? formatProjectEndWithDurationDe({
                  project_start: projectStart,
                  project_end: projectEnd,
                  project_status: projectStatus,
                  formatEndDate: (iso) => formatReferenceDate(iso, orgDateFmt),
                })
              : ''}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Akt. Dienstleister</span>
          <span className="font-medium">{incumbentProvider ?? ''}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Wettbewerber</span>
          <span className="font-medium">{competitors ?? ''}</span>
        </div>
      </CardContent>
    </Card>
  )
}
