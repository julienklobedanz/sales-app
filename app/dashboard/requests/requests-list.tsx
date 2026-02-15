'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { reviewRequest } from '../actions'
import type { RequestItem } from '../actions'
import { toast } from 'sonner'
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Lock,
} from 'lucide-react'

export function RequestsList({
  requests,
  isAdmin,
}: {
  requests: RequestItem[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleReview = async (
    id: string,
    decision: 'approve_external' | 'approve_internal' | 'reject'
  ) => {
    setLoadingId(id)
    try {
      await reviewRequest(id, decision)
      toast.success('Status aktualisiert')
      router.refresh()
    } catch {
      toast.error('Fehler aufgetreten')
    } finally {
      setLoadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'approved')
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Genehmigt
        </Badge>
      )
    if (status === 'rejected')
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" /> Abgelehnt
        </Badge>
      )
    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" /> In Prüfung
      </Badge>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {requests.map((req) => (
        <Card key={req.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="mb-2 flex items-start justify-between">
              <Badge variant="outline">{req.company_name}</Badge>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(req.created_at), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
            </div>
            <CardTitle className="text-base">{req.reference_title}</CardTitle>
            {isAdmin && req.requester_name && (
              <CardDescription>
                Angefragt von: {req.requester_name}
              </CardDescription>
            )}
          </CardHeader>

          <CardFooter className="mt-auto flex items-center justify-between border-t bg-muted/10 p-3">
            <div>{getStatusBadge(req.status)}</div>

            {isAdmin && req.status === 'pending' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={loadingId === req.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => handleReview(req.id, 'approve_external')}
                  >
                    <Globe className="mr-2 h-4 w-4 text-green-600" /> Extern
                    freigeben
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleReview(req.id, 'approve_internal')}
                  >
                    <Lock className="mr-2 h-4 w-4 text-blue-600" /> Intern
                    freigeben
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleReview(req.id, 'reject')}
                    className="text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Ablehnen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
