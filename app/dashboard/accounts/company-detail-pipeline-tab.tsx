import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppIcon } from '@/lib/icons'
import { DatabaseSyncIcon, Wifi01Icon } from '@hugeicons/core-free-icons'
import type { AccountDealRow } from './actions'
import { ROUTES } from '@/lib/routes'
import { formatDealVolume } from '@/lib/format'

export function CompanyDetailPipelineTab({
  activeDeals,
}: {
  activeDeals: AccountDealRow[]
}) {
  // Salesforce-Integration ist optional. Sobald `salesforce_opportunity_id` gesetzt ist, gilt der Deal als CRM-gesynct.
  const hasCrm = activeDeals.some((d) => Boolean((d as unknown as { salesforce_opportunity_id?: string | null }).salesforce_opportunity_id))
  const hasLocal = activeDeals.some((d) => !((d as unknown as { salesforce_opportunity_id?: string | null }).salesforce_opportunity_id))
  const pipelineSource: 'live' | 'local' | 'mixed' = hasCrm && hasLocal ? 'mixed' : hasCrm ? 'live' : 'local'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>
              {activeDeals.length} Deals · Quelle:{' '}
              <span className="inline-flex items-center gap-1">
                <AppIcon icon={pipelineSource === 'live' ? Wifi01Icon : DatabaseSyncIcon} size={14} className="text-muted-foreground" />
                {pipelineSource === 'live' ? 'CRM (Live)' : pipelineSource === 'mixed' ? 'CRM + Lokal' : 'RefStack (Lokal)'}
              </span>
            </CardDescription>
          </div>
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
                  <TableHead>Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDeals.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" href={ROUTES.deals.detail(d.id)}>
                        {d.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDealVolume(d.volume)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.expiry_date ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(d as unknown as { salesforce_opportunity_id?: string | null }).salesforce_opportunity_id
                        ? 'Live'
                        : 'Lokal'}
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

