import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Linkedin01Icon, Pencil, Plus, Trash2 } from '@hugeicons/core-free-icons'
import type { ContactPersonRow, ExternalContactRow } from './actions'
import { AppIcon } from '@/lib/icons'
import { buildInternalContactLinkedInHref } from '@/lib/linkedin-people-search'

type Props = {
  internalContacts: ContactPersonRow[]
  externalContacts: ExternalContactRow[]
  organizationName: string | null
  /** Ein interner Kontakt pro Account als Ansprechpartner für Koordination der Referenzfreigabe */
  internalReferenceApprovalContactId: string | null
  canEdit: boolean
  onAdd: () => void
  onEdit: (c: ContactPersonRow) => void
  onRemove: (id: string) => void
}

export function CompanyDetailContactsTab({
  internalContacts,
  externalContacts,
  organizationName,
  internalReferenceApprovalContactId,
  canEdit,
  onAdd,
  onEdit,
  onRemove,
}: Props) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Kontakte</CardTitle>
          <CardDescription className="sr-only">Interne und externe Ansprechpartner</CardDescription>
        </div>
        {canEdit && (
          <Button type="button" size="sm" onClick={onAdd}>
            <AppIcon icon={Plus} size={16} className="mr-2" />
            Internen Kontakt hinzufügen
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-8 pt-0">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Interne Kontakte</h3>
              {internalContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine internen Kontakte.</p>
              ) : (
                <Table className="w-full min-w-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[8rem]">Name</TableHead>
                      <TableHead className="min-w-[10rem]">E-Mail</TableHead>
                      <TableHead className="whitespace-nowrap">Telefon</TableHead>
                      <TableHead className="w-12 text-center">LinkedIn</TableHead>
                      <TableHead className="min-w-[7rem]">Position</TableHead>
                      <TableHead className="whitespace-nowrap">Letzte Interaktion</TableHead>
                      <TableHead className="w-24 text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalContacts.map((c) => {
                      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                      const last =
                        ((c as unknown as { last_interaction_at?: string | null }).last_interaction_at ?? '') ||
                        '—'
                      const isRefApproval = internalReferenceApprovalContactId === c.id
                      const liHref = buildInternalContactLinkedInHref({
                        firstName: c.first_name,
                        lastName: c.last_name,
                        linkedinUrl: (c as unknown as { linkedin_url?: string | null }).linkedin_url,
                        organizationName,
                        email: c.email,
                      })
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="min-w-0 font-medium">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              {name}
                              {isRefApproval ? (
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  Referenzfreigabe
                                </Badge>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-0 break-words text-muted-foreground">
                            {c.email ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {(c.phone ?? '') || '—'}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {liHref ? (
                              <a
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-[#0A66C2] hover:bg-muted"
                                href={liHref}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`${name} bei LinkedIn suchen`}
                                title="LinkedIn"
                              >
                                <AppIcon icon={Linkedin01Icon} size={20} />
                              </a>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="min-w-0 text-muted-foreground">
                            <span className="line-clamp-2 break-words">
                              {((c as unknown as { position?: string | null }).position ?? '') || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{last}</TableCell>
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
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Externe Kontakte</h3>
              {externalContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine externen Kontakte.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Letzte Interaktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {externalContacts.map((c) => {
                      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                      const last =
                        ((c as unknown as { last_interaction_at?: string | null }).last_interaction_at ?? '') ||
                        '—'
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{c.role ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{last}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </section>
      </CardContent>
    </Card>
  )
}
