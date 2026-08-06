import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus } from '@hugeicons/core-free-icons'
import type { ExternalContactRow, StakeholderRow } from './actions'
import {
  ContactActionButtons,
  externalContactJobTitle,
  formatLastInteraction,
} from './company-contact-action-buttons'
import { StakeholderRoleBadge } from './company-stakeholder-role-badge'
import { AppIcon } from '@/lib/icons'
import { buildInternalContactLinkedInHref } from '@/lib/linkedin-people-search'

function splitStakeholderName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') }
}

type Props = {
  stakeholders: StakeholderRow[]
  externalContacts: ExternalContactRow[]
  companyName: string
  canEdit: boolean
  onAdd: () => void
  onEdit: (s: StakeholderRow) => void
  onRemove: (id: string) => void
}

export function AccountDetailStakeholdersTab({
  stakeholders,
  externalContacts,
  companyName,
  canEdit,
  onAdd,
  onEdit,
  onRemove,
}: Props) {
  const isEmpty = stakeholders.length === 0 && externalContacts.length === 0

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Stakeholder</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Buying-Center am Kunden · Ansprechpartner aus Referenzen erscheinen
            automatisch
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
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">Noch keine Stakeholder.</p>
        ) : (
          <Table className="w-full min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[8rem]">Name</TableHead>
                <TableHead className="min-w-[7rem]">Titel</TableHead>
                <TableHead className="min-w-[7rem]">Rolle</TableHead>
                <TableHead className="min-w-[5rem]">Einfluss</TableHead>
                <TableHead className="min-w-[5rem]">Haltung</TableHead>
                <TableHead className="whitespace-nowrap">Letzte Interaktion</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stakeholders.map((s) => {
                const { firstName, lastName } = splitStakeholderName(s.name)
                const liHref = buildInternalContactLinkedInHref({
                  firstName,
                  lastName,
                  linkedinUrl: s.linkedin_url,
                  organizationName: companyName,
                  email: null,
                })
                const last = formatLastInteraction(
                  s.last_interaction_at ?? s.last_contact_at,
                )

                return (
                  <TableRow key={`stakeholder-${s.id}`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.title?.trim() || '—'}
                    </TableCell>
                    <TableCell>
                      <StakeholderRoleBadge role={s.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.influence_level ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.attitude ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {last}
                    </TableCell>
                    <TableCell className="text-right">
                      <ContactActionButtons
                        name={s.name}
                        linkedInHref={liHref}
                        canEdit={canEdit}
                        onEdit={() => onEdit(s)}
                        onRemove={() => void onRemove(s.id)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
              {externalContacts.map((c) => {
                const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
                const liHref = buildInternalContactLinkedInHref({
                  firstName: c.first_name,
                  lastName: c.last_name,
                  linkedinUrl: (c as unknown as { linkedin_url?: string | null })
                    .linkedin_url,
                  organizationName: companyName,
                  email: c.email,
                })
                const last = formatLastInteraction(
                  (c as unknown as { last_interaction_at?: string | null })
                    .last_interaction_at,
                )
                const jobTitle = externalContactJobTitle(c)

                return (
                  <TableRow key={`external-${c.id}`} className="bg-muted/20">
                    <TableCell className="font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {name}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal text-muted-foreground"
                        >
                          Referenz
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{jobTitle}</TableCell>
                    <TableCell>
                      {c.buying_center_role && c.buying_center_role !== 'unknown' ? (
                        <StakeholderRoleBadge role={c.buying_center_role} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {last}
                    </TableCell>
                    <TableCell className="text-right">
                      <ContactActionButtons
                        name={name}
                        email={c.email}
                        phone={c.phone}
                        linkedInHref={liHref}
                        canEdit={canEdit}
                        editDisabled
                        deleteDisabled
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
