"use client"

import { Brain } from "iconoir-react"

type SkillRuntimeOverviewData = {
  totalRequests: number
  skillAppliedCount: number
  fallbackCount: number
  fallbackRate: number
  topFallbackReasons: Array<{ reason: string; count: number }>
  byStage: Array<{
    stage: string
    requestCount: number
    fallbackCount: number
    fallbackRate: number
  }>
}

function formatReason(reason: string): string {
  if (!reason || reason === "unknown") return "Unknown"
  return reason.replace(/_/g, " ")
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

export function SkillMonitorSummaryPanel({
  data,
}: {
  data: SkillRuntimeOverviewData | undefined
}) {
  const applyRate =
    data && data.totalRequests > 0
      ? data.skillAppliedCount / data.totalRequests
      : 0

  const topFallback = data?.topFallbackReasons[0]

  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-fuchsia-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Skill Monitor
        </span>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <StatRow label="Total Runtime" value={data.totalRequests} />
          <StatRow
            label="Skill Applied"
            value={data.skillAppliedCount}
            suffix={`(${formatPercent(applyRate)})`}
          />
          <StatRow
            label="Fallback"
            value={data.fallbackCount}
            suffix={`(${formatPercent(data.fallbackRate)})`}
            warn={data.fallbackRate > 0.2}
          />
          <StatRow
            label="Top Reason"
            textValue={topFallback ? formatReason(topFallback.reason) : "-"}
            textClass="text-[10px]"
          />
        </div>
      )}
    </div>
  )
}

function StatRow({
  label,
  value,
  textValue,
  suffix,
  warn,
  textClass,
}: {
  label: string
  value?: number
  textValue?: string
  suffix?: string
  warn?: boolean
  textClass?: string
}) {
  const hasTextValue = typeof textValue === "string"

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5 text-right">
        <span
          className={`font-mono font-bold ${textClass ?? ""} ${warn ? "text-amber-500" : "text-foreground"}`}
        >
          {hasTextValue ? textValue : (value ?? 0).toLocaleString("id-ID")}
        </span>
        {suffix && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
