import { ReferenceContentCore } from '@/components/references/reference-content-core'
import { Card, CardTitle } from '@/components/ui/card'

export function ShowcaseReferenceContent({
  summary,
  challenge,
  solution,
}: {
  summary: string | null | undefined
  challenge: string | null | undefined
  solution: string | null | undefined
}) {
  return (
    <ReferenceContentCore
      surface="reduced"
      summary={summary}
      challenge={challenge}
      solution={solution}
      renderSection={({ title, children }) => (
        <Card className="p-6">
          <CardTitle as="h3" className="text-base">
            {title}
          </CardTitle>
          {children}
        </Card>
      )}
    />
  )
}
