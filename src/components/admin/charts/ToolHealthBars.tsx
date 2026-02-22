"use client"

import { cn } from "@/lib/utils"

type ToolGroup = {
  name: string
  total: number
  failures: number
  successRate: number
}

type ToolHealthBarsProps = {
  toolGroups: ToolGroup[]
}

function getBarColor(rate: number): string {
  if (rate >= 95) return "bg-emerald-500"
  if (rate >= 80) return "bg-amber-500"
  return "bg-rose-500"
}

function getRateTextColor(rate: number): string {
  if (rate >= 95) return "text-emerald-600 dark:text-emerald-400"
  if (rate >= 80) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

export function ToolHealthBars({ toolGroups }: ToolHealthBarsProps) {
  if (toolGroups.length === 0) {
    return (
      <div>
        <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
          KESEHATAN PER FITUR
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Belum ada data fitur
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
        KESEHATAN PER FITUR
      </p>

      <div className="mt-3 space-y-3">
        {toolGroups.map((tool) => (
          <div key={tool.name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] text-foreground">
                {tool.name}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] font-medium",
                  getRateTextColor(tool.successRate)
                )}
              >
                {tool.successRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  getBarColor(tool.successRate)
                )}
                style={{ width: `${Math.max(tool.successRate, tool.total > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {tool.failures > 0
                ? `${tool.failures} dari ${tool.total} gagal`
                : `${tool.total} permintaan, semua berhasil`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
