'use client'

import { Info } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  benchmarkRiskBadgeClass,
  benchmarkRiskTone,
  formatBenchmarkRiskTooltipLine,
  topBenchmarkRiskTooltipHits,
  type BenchmarkRiskAnalysis,
} from '@/lib/deal-desk/benchmark-risk'

export function BenchmarkRiskMetric({
  analysis,
  className,
}: {
  analysis: BenchmarkRiskAnalysis
  className?: string
}) {
  const tone = benchmarkRiskTone(analysis.scorePercent)
  const tooltipHits = topBenchmarkRiskTooltipHits(analysis.hits)

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              'cursor-help rounded px-2.5 py-0.5 text-xs font-medium shadow-none inline-flex items-center gap-1',
              benchmarkRiskBadgeClass(tone),
              className
            )}
            tabIndex={0}
          >
            <span>Benchmark-Risiko:</span>
            <span className="font-semibold tabular-nums">{analysis.scorePercent}%</span>
            <Info className="size-3.5 shrink-0 text-white/80" aria-hidden />
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900 text-white p-4 rounded-xl shadow-xl max-w-[340px] text-xs border-0"
        >
          <span className="font-bold text-slate-200 border-b border-slate-700 pb-1.5 mb-2 block">
            Benchmark-Risiko (Kriterien-basiert)
          </span>
          {tooltipHits.length > 0 ? (
            <ul className="space-y-1.5">
              {tooltipHits.map((hit) => (
                <li key={hit.id}>{formatBenchmarkRiskTooltipLine(hit)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-300">
              Keine Benchmark-Indikatoren im Dokument erkannt.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
