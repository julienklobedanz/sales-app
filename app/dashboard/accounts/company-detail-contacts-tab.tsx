import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from '@hugeicons/core-free-icons'
import type { ContactPersonRow } from './actions'
import { ContactActionButtons, contactRoleLabel } from './company-contact-action-buttons'
import { AppIcon } from '@/lib/icons'
import { buildInternalContactLinkedInHref } from '@/lib/linkedin-people-search'

type Props = {
  internalContacts: ContactPersonRow[]
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
          <CardTitle className="text-base">Interne Kontakte</CardTitle>
          <CardDescription className="sr-only">
            Kolleginnen und Kollegen für Referenzfreigabe und Account-Koordination
          </CardDescription>
        </div>
        {canEdit && (
          <Button type="button" size="sm" onClick={onAdd}>
            <AppIcon icon={Plus} size={16} className="mr-2" />
            Hinzufügen
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {internalContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine internen Kontakte.</p>
        ) : (
          <Table className="w-full min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[8rem]">Name</TableHead>
                <TableHead className="min-w-[7rem]">Rolle</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {internalContacts.map((c) => {
                const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                const isRefApproval = internalReferenceApprovalContactId === c.id
                const liHref = buildInternalContactLinkedInHref({
                  firstName: c.first_name,
                  lastName: c.last_name,
                  linkedinUrl: c.linkedin_url,
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
                    <TableCell className="min-w-0 text-muted-foreground">
                      <span className="line-clamp-2 break-words">{contactRoleLabel(c)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <ContactActionButtons
                        name={name}
                        email={c.email}
                        phone={c.phone}
                        linkedInHref={liHref}
                        canEdit={canEdit}
                        onEdit={() => onEdit(c)}
                        onRemove={() => void onRemove(c.id)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
