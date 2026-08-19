'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight, ClipboardList, ShieldCheck, Zap } from 'lucide-react'

export function WorkflowApprovalProcessCard() {
  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base">Approval Process</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Card className="flex-col items-start gap-2 p-4 text-sm sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 font-medium">
            <ClipboardList className="h-4 w-4" /> Entwurf
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 font-medium">
            <ShieldCheck className="h-4 w-4" /> Interner Review
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 font-medium">
            <Zap className="h-4 w-4" /> Kundenfreigabe
          </span>
        </Card>
      </CardContent>
    </Card>
  )
}
