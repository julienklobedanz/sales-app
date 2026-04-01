import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Plus, Trash2 } from '@hugeicons/core-free-icons'
import type { StakeholderRow } from './actions'
import { StakeholderRoleBadge } from './company-stakeholder-role-badge'
import { AppIcon } from '@/lib/icons'

type Props = {
  stakeholders: StakeholderRow[]
  canEdit: boolean
  onAdd: () => void
  onEdit: (s: StakeholderRow) => void
  onRemove: (id: string) => void
}

export function CompanyDetailStakeholdersTab({
  stakeholders,
  canEdit,
  onAdd,
  onEdit,
  onRemove,
}: Props) {
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
    </div>
  )
}
