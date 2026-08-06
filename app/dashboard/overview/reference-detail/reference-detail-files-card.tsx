'use client'

import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import { ExternalLink, FileText } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formatReferenceDate,
  type OrgDateDisplayFormat,
} from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { isSystemAdmin } from '@/lib/roles/capability-access'

import type { ReferenceAssetRow, ReferenceRow } from '../../actions'
import { updateReferenceAssetCategory } from '../../actions'
import type { Profile } from '../../dashboard-types'

export function ReferenceDetailFilesCard({
  selectedRef,
  profile,
  detailAssets,
  detailAssetsLoading,
  setDetailAssets,
  dateFmt,
}: {
  selectedRef: ReferenceRow
  profile: Profile
  detailAssets: ReferenceAssetRow[]
  detailAssetsLoading: boolean
  setDetailAssets: Dispatch<SetStateAction<ReferenceAssetRow[]>>
  dateFmt: OrgDateDisplayFormat
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Dateien
          </span>
          {detailAssetsLoading ? (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
              Dateien werden geladen…
            </div>
          ) : detailAssets.length === 0 && !selectedRef.file_path ? (
            <div className="text-muted-foreground bg-muted/10 flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
              <span>📎</span>
              <p>Keine Dateien vorhanden.</p>
            </div>
          ) : (
            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sales">Sales Material</TabsTrigger>
                <TabsTrigger value="contract">Verträge</TabsTrigger>
                <TabsTrigger value="other">Sonstiges</TabsTrigger>
              </TabsList>
              {(['sales', 'contract', 'other'] as const).map((cat) => {
                const legacyFile =
                  cat === 'other' && detailAssets.length === 0 && selectedRef.file_path
                    ? {
                        path: selectedRef.file_path,
                        name: selectedRef.file_path.split('/').pop() ?? 'Dokument',
                        isLegacy: true as const,
                      }
                    : null
                const assetsInCat = detailAssets.filter((a) => a.category === cat)
                const hasLegacy = !!legacyFile
                const hasItems = assetsInCat.length > 0 || hasLegacy
                return (
                  <TabsContent key={cat} value={cat} className="mt-2">
                    {!hasItems ? (
                      <p className="text-muted-foreground py-4 text-center text-sm">
                        Keine Dateien in dieser Kategorie.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {legacyFile && (
                          <li className="flex items-center justify-between gap-2 rounded-lg border p-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <AppIcon
                                icon={FileText}
                                size={16}
                                className="shrink-0 text-muted-foreground"
                              />
                              <span className="truncate text-sm">{legacyFile.name}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 shrink-0 text-xs"
                              asChild
                            >
                              <a
                                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${legacyFile.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <AppIcon icon={ExternalLink} size={12} className="mr-1" />{' '}
                                Öffnen
                              </a>
                            </Button>
                          </li>
                        )}
                        {assetsInCat.map((asset) => (
                          <li
                            key={asset.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <AppIcon
                                icon={FileText}
                                size={16}
                                className="shrink-0 text-muted-foreground"
                              />
                              <span className="truncate text-sm">
                                {asset.file_name ||
                                  asset.file_path.split('/').pop() ||
                                  'Dokument'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSystemAdmin(profile.systemRole) && (
                                <Select
                                  value={asset.category}
                                  onValueChange={async (
                                    value: 'sales' | 'contract' | 'other',
                                  ) => {
                                    const res = await updateReferenceAssetCategory(
                                      asset.id,
                                      value,
                                    )
                                    if (res.success) {
                                      setDetailAssets((prev) =>
                                        prev.map((a) =>
                                          a.id === asset.id
                                            ? { ...a, category: value }
                                            : a,
                                        ),
                                      )
                                      toast.success('Kategorie aktualisiert.')
                                    } else {
                                      toast.error(
                                        res.error ?? 'Fehler beim Aktualisieren.',
                                      )
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-[130px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sales">Sales Material</SelectItem>
                                    <SelectItem value="contract">Verträge</SelectItem>
                                    <SelectItem value="other">Sonstiges</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 shrink-0 text-xs"
                                asChild
                              >
                                <a
                                  href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${asset.file_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <AppIcon
                                    icon={ExternalLink}
                                    size={12}
                                    className="mr-1"
                                  />{' '}
                                  Öffnen
                                </a>
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </div>
        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Historie
          </span>
          <div className="relative ml-1.5 space-y-4 border-l pl-4">
            <div className="relative">
              <span className="bg-primary ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
              <p className="text-xs font-medium">Referenz erstellt</p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                {formatReferenceDate(selectedRef.created_at, dateFmt)}
              </p>
            </div>
            {selectedRef.updated_at &&
              selectedRef.updated_at !== selectedRef.created_at && (
                <div className="relative">
                  <span className="bg-muted-foreground/50 ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
                  <p className="text-xs font-medium">Letzte Änderung</p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {formatReferenceDate(selectedRef.updated_at, dateFmt)}
                  </p>
                </div>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
