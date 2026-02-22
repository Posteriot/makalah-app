"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"

interface ToolHealthEntry {
  tool: string
  totalCalls: number
  successCount: number
  failureCount: number
  successRate: number
  avgLatencyMs: number
  lastFailure?: number
}

function rateColor(rate: number): string {
  if (rate >= 0.95) return "text-emerald-500"
  if (rate >= 0.8) return "text-amber-500"
  return "text-rose-500"
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}d`
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "baru saja"
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

const TOOL_LABELS: Record<string, string> = {
  "(chat biasa)": "Obrolan Biasa",
  google_search: "Pencarian Web",
  startPaperSession: "Mulai Paper",
  updateStageData: "Update Stage",
  submitStageForValidation: "Submit Validasi",
  getCurrentPaperState: "State Paper",
}

export function ToolHealthPanel({
  data,
}: {
  data: ToolHealthEntry[] | undefined
}) {
  return (
    <div className="rounded-shell border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Kesehatan Tool
        </span>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-action bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground font-mono">
          Belum ada data tool.
        </p>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-3 py-1">
            <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-widest">
              Tool
            </span>
            <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-widest text-right">
              Panggilan
            </span>
            <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-widest text-right">
              Sukses
            </span>
            <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-widest text-right">
              Latensi
            </span>
          </div>

          {data.map((entry) => (
            <ToolRow key={entry.tool} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function ToolRow({ entry }: { entry: ToolHealthEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hasFailure = entry.lastFailure !== undefined

  return (
    <div>
      <button
        onClick={() => hasFailure && setExpanded(!expanded)}
        disabled={!hasFailure}
        className={cn(
          "grid grid-cols-[1fr_80px_80px_80px] gap-2 w-full rounded-action border border-border px-3 py-2 text-left transition-colors",
          hasFailure && "cursor-pointer hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasFailure && (
            expanded ? (
              <NavArrowDown className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : (
              <NavArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )
          )}
          <span className="text-xs font-mono font-bold text-foreground truncate">
            {TOOL_LABELS[entry.tool] ?? entry.tool}
          </span>
        </div>
        <span className="text-xs font-mono text-foreground text-right">
          {entry.totalCalls.toLocaleString("id-ID")}
        </span>
        <span
          className={cn(
            "text-xs font-mono font-bold text-right",
            rateColor(entry.successRate)
          )}
        >
          {(entry.successRate * 100).toFixed(1)}%
        </span>
        <span className="text-xs font-mono text-muted-foreground text-right">
          {formatLatency(entry.avgLatencyMs)}
        </span>
      </button>

      {expanded && entry.lastFailure !== undefined && (
        <div className="ml-6 mt-1 mb-1 rounded-action border border-border/50 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span>Kegagalan terakhir:</span>
            <span className="text-rose-500 font-bold">
              {timeAgo(entry.lastFailure)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-0.5">
            <span>Total gagal:</span>
            <span className="text-rose-500 font-bold">{entry.failureCount}</span>
          </div>
        </div>
      )}
    </div>
  )
}
