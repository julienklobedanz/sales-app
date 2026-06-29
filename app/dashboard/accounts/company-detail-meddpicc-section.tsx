import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

function autoResizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = '0px'
  el.style.height = `${Math.max(el.scrollHeight, 36)}px`
}

type StrategyField = {
  key: string
  label: string
  value: string
  set: (v: string) => void
}

export function CompanyDetailMeddpiccSection({
  canEdit,
  strategySaving,
  strategyFields,
  saveStrategy,
}: {
  canEdit: boolean
  strategySaving: boolean
  strategyFields: StrategyField[]
  saveStrategy: (opts?: { silent?: boolean }) => Promise<void>
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          MEDDPICC
          {strategySaving ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <AppIcon icon={Loader} size={14} className="animate-spin" />
              Speichern…
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {strategyFields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={`strategy-${f.key}`}>{f.label}</Label>
            <Textarea
              id={`strategy-${f.key}`}
              rows={1}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              onInput={(e) => autoResizeTextarea(e.currentTarget)}
              ref={(el) => {
                if (el) autoResizeTextarea(el)
              }}
              onBlur={() => {
                void saveStrategy({ silent: true })
              }}
              disabled={!canEdit || strategySaving}
              className="h-9 min-h-0 resize-none overflow-hidden leading-6"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
