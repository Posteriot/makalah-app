"use client"

import { Page } from "iconoir-react"

interface ArtifactSyncData {
  totalArtifacts: number
  invalidatedPending: number
}

export function ArtifactSyncPanel({
  data,
}: {
  data: ArtifactSyncData | undefined
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="flex items-center gap-2 mb-4">
        <Page className="h-4 w-4 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Artifact Sync
        </span>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <StatRow label="Total Artifacts" value={data.totalArtifacts} />
          <StatRow
            label="Invalidated (Pending)"
            value={data.invalidatedPending}
            warn={data.invalidatedPending > 0}
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
