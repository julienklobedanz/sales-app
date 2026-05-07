import Link from 'next/link'
import { ChevronRight, ClipboardList, ShieldCheck, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import { Button } from '@/components/ui/button'

export default function WorkflowSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Approval Process</CardTitle>
          <CardDescription>Freigabekette für Referenzen.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 font-medium">
              <ClipboardList className="h-4 w-4" /> Entwurf
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 font-medium">
              <ShieldCheck className="h-4 w-4" /> Interner Review
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 font-medium">
              <Zap className="h-4 w-4" /> Kundenfreigabe
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Workflow-Konfiguration</CardTitle>
          <CardDescription>
            Die editierbaren Einstellungen liegen im Settings-Tab „Workflow“.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={ROUTES.settings}>Zu den Einstellungen</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

