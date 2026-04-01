import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AccountDealRow, CompanyRefRow } from './actions'
import { referenceStatusLabel } from './company-detail-constants'

type Props = {
  references: CompanyRefRow[]
  activeDeals: AccountDealRow[]
}

export function CompanyDetailLinksTab({ references, activeDeals }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verknüpfte Referenzen</CardTitle>
          <CardDescription>{references.length} Referenzen</CardDescription>
        </CardHeader>
        <CardContent>
          {references.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Referenzen verknüpft.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nutzung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {references.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={`/dashboard/evidence/${r.id}`}>
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{referenceStatusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktive Deals</CardTitle>
          <CardDescription>{activeDeals.length} Deals</CardDescription>
        </CardHeader>
        <CardContent>
          {activeDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine aktiven Deals.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titel</TableHead>
                  <TableHead>Volumen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ablauf</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDeals.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={`/dashboard/deals/${d.id}`}>
                        {d.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.volume ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.expiry_date ?? '—'}</TableCell>
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
