import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, StarIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { toggleFavorite } from '@/app/dashboard/actions'
import { ROUTES } from '@/lib/routes'
import { deleteReferenceFromDetailPage } from './actions'
import { PdfExportDialog } from './pdf-export-dialog'
import { PptxOnepagerExportButton } from './pptx-onepager-export-button'
import { ShareLinkButton } from './share-link-button'

export type ReferenceDetailActionsCardProps = {
  referenceId: string
  isSalesView: boolean
  isFavorited: boolean
  canManageAsAdmin: boolean
}

export function ReferenceDetailActionsCard({
  referenceId,
  isSalesView,
  isFavorited,
  canManageAsAdmin,
}: ReferenceDetailActionsCardProps) {
  return (
    <Card className="order-3">
      <CardHeader>
        <CardTitle className="text-base">Aktionen</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <PptxOnepagerExportButton referenceId={referenceId} className="w-full gap-2" />
          <PdfExportDialog referenceId={referenceId} triggerClassName="w-full" />
        </div>
        {isSalesView ? null : (
          <>
            <ShareLinkButton referenceId={referenceId} triggerClassName="w-full" />
            <form action={toggleFavorite.bind(null, referenceId)}>
              <Button type="submit" variant="outline" className="w-full gap-2">
                <AppIcon
                  icon={StarIcon}
                  size={16}
                  className={
                    isFavorited
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-muted-foreground opacity-80'
                  }
                />
                {isFavorited ? 'Favorit' : 'Favorisieren'}
              </Button>
            </form>
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href={ROUTES.references.edit(referenceId)}>
                <AppIcon icon={Pencil} size={16} />
                Bearbeiten
              </Link>
            </Button>
            {canManageAsAdmin ? (
              <form
                action={deleteReferenceFromDetailPage.bind(null, referenceId)}
                className="w-full"
              >
                <Button type="submit" variant="destructive" className="w-full">
                  Löschen
                </Button>
              </form>
            ) : null}
          </>
        )}
        {isSalesView ? (
          <>
            <ShareLinkButton referenceId={referenceId} triggerClassName="w-full" />
            <form action={toggleFavorite.bind(null, referenceId)}>
              <Button type="submit" variant="outline" className="w-full gap-2">
                <AppIcon
                  icon={StarIcon}
                  size={16}
                  className={
                    isFavorited
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-muted-foreground opacity-80'
                  }
                />
                {isFavorited ? 'Favorit' : 'Favorisieren'}
              </Button>
            </form>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
