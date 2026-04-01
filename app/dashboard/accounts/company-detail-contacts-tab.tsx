import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Plus, Trash2 } from '@hugeicons/core-free-icons'
import type { ContactPersonRow } from './actions'
import { AppIcon } from '@/lib/icons'

type Props = {
  contacts: ContactPersonRow[]
  canEdit: boolean
  onAdd: () => void
  onEdit: (c: ContactPersonRow) => void
  onRemove: (id: string) => void
}

export function CompanyDetailContactsTab({
  contacts,
  canEdit,
  onAdd,
  onEdit,
  onRemove,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Kontakte</h2>
          <p className="text-sm text-muted-foreground">Ansprechpartner (intern/extern).</p>
        </div>
        {canEdit && (
          <Button type="button" onClick={onAdd}>
            <AppIcon icon={Plus} size={16} className="mr-2" />
            Kontakt hinzufügen
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Kontakte.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => {
                  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{(c.phone ?? '') || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(c as unknown as { linkedin_url?: string | null }).linkedin_url ? (
                          <a
                            className="hover:underline"
                            href={(c as unknown as { linkedin_url?: string | null }).linkedin_url as string}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Link
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(c.role ?? '') || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {((c as unknown as { position?: string | null }).position ?? '') || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(c)}>
                              <AppIcon icon={Pencil} size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void onRemove(c.id)}
                            >
                              <AppIcon icon={Trash2} size={16} />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
