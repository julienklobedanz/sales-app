import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Plus, Trash2 } from '@hugeicons/core-free-icons'
import type { StakeholderRow } from './actions'
import { StakeholderRoleBadge } from './company-stakeholder-role-badge'
import { AppIcon } from '@/lib/icons'
import { formatDateUtcDe } from '@/lib/format'
import type { CompanyDetailClientProps } from './company-detail-types'
import { ROUTES } from '@/lib/routes'

type Props = {
  stakeholders: StakeholderRow[]
  marketSignals: CompanyDetailClientProps['marketSignals']
  canEdit: boolean
  onAdd: () => void
  onEdit: (s: StakeholderRow) => void
  onRemove: (id: string) => void
}

export function CompanyDetailStakeholdersTab({
  stakeholders,
  marketSignals,
  canEdit,
  onAdd,
  onEdit,
  onRemove,
}: Props) {
  const [visibleChampionCount, setVisibleChampionCount] = useState(3)
  const [visibleNewsCount, setVisibleNewsCount] = useState(3)

  function newsSourceHref(row: CompanyDetailClientProps['marketSignals']['accountNews'][number]) {
    const source = String(row.sourceLabel ?? '').trim()
    if (/^https?:\/\//i.test(source)) return source
    const q = [source, row.body].filter(Boolean).join(' ')
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`
  }

  function championHref(row: CompanyDetailClientProps['marketSignals']['championMoves'][number]) {
    const search = `${row.personName} ${row.personTitleAfter ?? ''}`.trim()
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(search)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Stakeholder</h2>
          <p className="text-sm text-muted-foreground">Economic Buyer, Champion, Blocker usw.</p>
        </div>
        {canEdit && (
          <Button type="button" onClick={onAdd}>
            <AppIcon icon={Plus} size={16} className="mr-2" />
            Stakeholder hinzufügen
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {stakeholders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Stakeholder.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Einfluss</TableHead>
                  <TableHead>Haltung</TableHead>
                  <TableHead>Letzter Kontakt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stakeholders.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.title ?? '—'}</TableCell>
                    <TableCell>
                      <StakeholderRoleBadge role={s.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(s as unknown as { influence_level?: string | null }).influence_level ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(s as unknown as { attitude?: string | null }).attitude ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {((s as unknown as { last_contact_at?: string | null }).last_contact_at ?? '')?.slice(
                        0,
                        10
                      ) || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <div className="inline-flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(s)}>
                            <AppIcon icon={Pencil} size={16} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void onRemove(s.id)}
                          >
                            <AppIcon icon={Trash2} size={16} />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-base font-semibold">Marktsignal-Historie</h3>
          <p className="text-sm text-muted-foreground">
            Verlauf der Signale für diesen Account, getrennt nach Champion Moves und Account News.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <h4 className="text-sm font-semibold">Champion Moves</h4>
              {marketSignals.championMoves.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Keine Champion Moves vorhanden.</p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {marketSignals.championMoves.slice(0, visibleChampionCount).map((row) => (
                    <li key={row.id} className="rounded-md border border-border/70 bg-card px-3 py-2">
                      <Link
                        href={championHref(row)}
                        target="_blank"
                        rel="noreferrer"
                        className="block hover:opacity-90"
                      >
                        <p className="text-sm font-medium leading-snug">
                          {row.personName}
                          {row.personTitleAfter ? ` → ${row.personTitleAfter}` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.changeSummary || 'Positionswechsel erkannt'}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.detectedAt ? formatDateUtcDe(row.detectedAt) : '—'}
                        </p>
                      </Link>
                    </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between">
                    <Link
                      href={ROUTES.marketSignals}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Zu Marktsignalen
                    </Link>
                    {marketSignals.championMoves.length > visibleChampionCount ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setVisibleChampionCount((prev) => prev + 3)}
                      >
                        Mehr anzeigen
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h4 className="text-sm font-semibold">Account News</h4>
              {marketSignals.accountNews.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Keine Account News vorhanden.</p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {marketSignals.accountNews.slice(0, visibleNewsCount).map((row) => (
                    <li key={row.id} className="rounded-md border border-border/70 bg-card px-3 py-2">
                      <Link
                        href={newsSourceHref(row)}
                        target="_blank"
                        rel="noreferrer"
                        className="block hover:opacity-90"
                      >
                        <p className="text-sm leading-snug">{row.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.publishedOn ? formatDateUtcDe(row.publishedOn) : '—'}
                          {row.sourceLabel ? ` · ${row.sourceLabel}` : ''}
                        </p>
                      </Link>
                    </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between">
                    <Link
                      href={ROUTES.marketSignals}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Zu Marktsignalen
                    </Link>
                    {marketSignals.accountNews.length > visibleNewsCount ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setVisibleNewsCount((prev) => prev + 3)}
                      >
                        Mehr anzeigen
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
