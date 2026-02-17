"use client"

import { Brain } from "iconoir-react"

interface MemoryHealthData {
  totalActive: number
  avgDigestEntries: number
  sessionsWithSuperseded: number
  sessionsWithDirty: number
}

export function MemoryHealthPanel({
  data,
}: {
  data: MemoryHealthData | undefined
}) {
  return (
    <div className="rounded-shell border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-sky-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Memory Health
        </span>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <StatRow label="Active Sessions" value={data.totalActive} />
          <StatRow label="Avg Digest Entries" value={data.avgDigestEntries} />
          <StatRow
            label="With Superseded"
            value={data.sessionsWithSuperseded}
            warn={data.sessionsWithSuperseded > 0}
          />
          <StatRow
            label="Dirty (Desync)"
            value={data.sessionsWithDirty}
            warn={data.sessionsWithDirty > 0}
          />
        </div>
      )}
    </div>
  )
}

function StatRow({
  label,
  value,
  warn,
}: {
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono font-bold ${warn ? "text-amber-500" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  )
}
