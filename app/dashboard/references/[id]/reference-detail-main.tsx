import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, LinkIcon, TrendingUp, UploadIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { ReferenceContextHighlighted } from '@/components/reference-context-highlighted'
import { ReferenceActivitiesTimeline } from './reference-activities-timeline'
import type { ReferenceActivityItem } from './reference-detail-activities'
import type { DetailFileRow } from './reference-detail-helpers'

/** Herausforderung und Lösung untereinander (ruhiger Lesefluss). */
const challengeSolutionGridClass = 'grid gap-4 grid-cols-1'

function ReferenceDetailFilesCard({ files }: { files: DetailFileRow[] }) {
  if (files.length === 0) return null
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base inline-flex items-center gap-2">
          <AppIcon icon={UploadIcon} size={16} className="text-muted-foreground" />
          Dateien
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.key} className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate text-muted-foreground">{f.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                {f.category ? (
                  <Badge variant="outline" className="text-[10px] font-normal capitalize">
                    {f.category === 'sales'
                      ? 'Sales'
                      : f.category === 'contract'
                        ? 'Vertrag'
                        : 'Sonstiges'}
                  </Badge>
                ) : null}
                <a
                  className="text-xs font-medium text-primary hover:underline"
                  href={f.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  Öffnen
                </a>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

type ReferenceDetailMainProps = {
  isSalesView: boolean
  hasChallenge: boolean
  hasSolution: boolean
  challengeText: string | null
  solutionText: string | null
  highlightPhrases: string[]
  detailFileRows: DetailFileRow[]
  referenceActivities: ReferenceActivityItem[]
}

export function ReferenceDetailMain({
  isSalesView,
  hasChallenge,
  hasSolution,
  challengeText,
  solutionText,
  highlightPhrases,
  detailFileRows,
  referenceActivities,
}: ReferenceDetailMainProps) {
  const filesCard = <ReferenceDetailFilesCard files={detailFileRows} />

  return (
    <div className="space-y-6">
      {hasChallenge || hasSolution ? (
        <div className="w-full min-w-0 space-y-6">
          <div className={challengeSolutionGridClass}>
            {hasChallenge ? (
              <Card className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                    <AppIcon icon={TrendingUp} size={14} className="text-muted-foreground" />
                    Herausforderung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <ReferenceContextHighlighted text={challengeText} phrases={highlightPhrases} />
                  </p>
                </CardContent>
              </Card>
            ) : null}
            {hasSolution ? (
              <Card className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                    <AppIcon icon={LinkIcon} size={14} className="text-muted-foreground" />
                    Lösung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <ReferenceContextHighlighted text={solutionText} phrases={highlightPhrases} />
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
          {isSalesView ? filesCard : null}
        </div>
      ) : isSalesView && detailFileRows.length > 0 ? (
        <div className="w-full min-w-0">{filesCard}</div>
      ) : null}

      {isSalesView ? (
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
              <AppIcon icon={Calendar} size={14} className="text-muted-foreground" />
              Letzte Ereignisse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceActivitiesTimeline items={referenceActivities} />
          </CardContent>
        </Card>
      ) : (
        <>
          {filesCard}
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                <AppIcon icon={Calendar} size={14} className="text-muted-foreground" />
                Letzte Ereignisse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReferenceActivitiesTimeline items={referenceActivities} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
