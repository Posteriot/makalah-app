"use client"

import { cn } from "@/lib/utils"

interface ProviderHealthEntry {
  provider: string
  totalRequests: number
  successCount: number
  failureCount: number
  successRate: number
  avgLatencyMs: number
}

function rateColor(rate: number): string {
  if (rate >= 0.95) return "text-emerald-500"
  if (rate >= 0.8) return "text-amber-500"
  return "text-rose-500"
}

function dotColor(rate: number): string {
  if (rate >= 0.95) return "bg-emerald-500"
  if (rate >= 0.8) return "bg-amber-500"
  return "bg-rose-500"
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}d`
}

const PROVIDER_LABELS: Record<string, string> = {
  "vercel-gateway": "Vercel AI Gateway",
  openrouter: "OpenRouter",
}

export function ProviderHealthPanel({
  data,
}: {
  data: ProviderHealthEntry[] | undefined
}) {
  return (
    <div className="rounded-shell border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Kesehatan Provider
        </span>
      </div>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 rounded-action bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground font-mono">
          Belum ada data provider.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((entry) => (
            <div
              key={entry.provider}
              className="flex items-center justify-between gap-3 rounded-action border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    dotColor(entry.successRate)
                  )}
                />
                <span className="text-xs font-mono font-bold text-foreground truncate">
                  {PROVIDER_LABELS[entry.provider] ?? entry.provider}
                </span>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {entry.totalRequests.toLocaleString("id-ID")} req
                </span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold",
                    rateColor(entry.successRate)
                  )}
                >
                  {(entry.successRate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatLatency(entry.avgLatencyMs)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
