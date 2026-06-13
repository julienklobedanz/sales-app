import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppIcon } from '@/lib/icons'
import { DatabaseSyncIcon, Wifi01Icon } from '@hugeicons/core-free-icons'
import type { AccountDealRow } from './actions'
import { buildCrmDealUrl, dealHasCrmSync } from '@/lib/crm/deal-links'
import { ROUTES } from '@/lib/routes'
import { formatDealVolume } from '@/lib/format'

export function CompanyDetailPipelineTab({
  activeDeals,
  hubspotPortalId = null,
}: {
  activeDeals: AccountDealRow[]
  hubspotPortalId?: string | null
}) {
  const hasCrm = activeDeals.some((d) => dealHasCrmSync(d))
  const hasLocal = activeDeals.some((d) => !dealHasCrmSync(d))
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
                      {(() => {
                        const crmLink = buildCrmDealUrl(d, { hubspotPortalId })
                        if (crmLink && crmLink.href !== '#') {
                          return (
                            <a
                              href={crmLink.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {crmLink.label}
                            </a>
                          )
                        }
                        if (crmLink) {
                          return crmLink.label
                        }
                        return 'Lokal'
                      })()}
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
