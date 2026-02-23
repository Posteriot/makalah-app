"use client"

import { Activity } from "iconoir-react"

interface WorkflowProgressData {
  totalSessions: number
  activeSessions: number
  completedSessions: number
  completionRate: number
  inRevision: number
  byStage: Record<string, number>
  totalRewinds: number
}

export function WorkflowProgressPanel({
  data,
}: {
  data: WorkflowProgressData | undefined
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-emerald-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Workflow Progress
        </span>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <StatRow label="Total Sessions" value={data.totalSessions} />
          <StatRow label="Active" value={data.activeSessions} />
          <StatRow label="Completed" value={data.completedSessions} />
          <StatRow
            label="Completion Rate"
            value={data.completionRate}
            suffix="%"
          />
          <StatRow
            label="In Revision"
            value={data.inRevision}
            warn={data.inRevision > 0}
          />
          <StatRow label="Total Rewinds" value={data.totalRewinds} />
        </div>
      )}
    </div>
  )
}

function StatRow({
  label,
  value,
  suffix,
  warn,
}: {
  label: string
  value: number
  suffix?: string
  warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono font-bold ${warn ? "text-amber-500" : "text-foreground"}`}
      >
        {value}
        {suffix}
      </span>
    </div>
  )
}
