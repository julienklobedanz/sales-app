import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

type StrategyField = {
  key: string
  label: string
  value: string
  set: (v: string) => void
}

type Props = {
  isSales: boolean
  canEdit: boolean
  strategySaving: boolean
  strategyFields: StrategyField[]
  saveStrategy: (opts?: { silent?: boolean }) => Promise<void>
}

export function CompanyDetailStrategyTab({
  isSales,
  canEdit,
  strategySaving,
  strategyFields,
  saveStrategy,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Strategie</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              {isSales ? (
                'Nur Lesen – nur Account Manager oder Admin können bearbeiten.'
              ) : canEdit ? (
                <>
                  Änderungen werden automatisch gespeichert, wenn Sie ein Feld verlassen (Fokus
                  verlassen).
                  {strategySaving ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <AppIcon icon={Loader} size={14} className="animate-spin" />
                      Speichern…
                    </span>
                  ) : null}
                </>
              ) : (
                '—'
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {canEdit && !isSales ? (
          <div className="space-y-6">
            {strategyFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`strategy-${f.key}`}>{f.label}</Label>
                <Textarea
                  id={`strategy-${f.key}`}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  onBlur={() => {
                    void saveStrategy({ silent: true })
                  }}
                  disabled={strategySaving}
                  className="min-h-[110px]"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {strategyFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </div>
                <div className="whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 text-sm">
                  {f.value.trim().length ? f.value : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
