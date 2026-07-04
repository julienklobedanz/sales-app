import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'

export function DealRfpBlockPlaceholder() {
  return (
    <Card id="ausschreibung">
      <CardHeader>
        <CardTitle className="text-base">Ausschreibung</CardTitle>
        <CardDescription>{COPY.deals.cockpit.rfpBlockPlaceholder}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Metrik-Kacheln, Eignungs-Check, Risiken und Antwort-Entwürfe werden in den nächsten Phasen hier
          eingebunden.
        </p>
      </CardContent>
    </Card>
  )
}
