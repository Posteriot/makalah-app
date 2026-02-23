"use client"

interface OverviewStatsData {
  totalRequests: number
  successRate: number
  avgLatencyMs: number
  failoverCount: number
  failoverRate: number
  totalInputTokens: number
  totalOutputTokens: number
}

function rateColor(rate: number): string {
  if (rate >= 0.95) return "text-emerald-500"
  if (rate >= 0.8) return "text-amber-500"
  return "text-rose-500"
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}dtk`
}

export function OverviewStatsPanel({
  data,
}: {
  data: OverviewStatsData | undefined
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Ringkasan
        </span>
      </div>

      {!data ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Total Permintaan"
            value={data.totalRequests.toLocaleString("id-ID")}
          />
          <MetricCard
            label="Tingkat Keberhasilan"
            value={`${(data.successRate * 100).toFixed(1)}%`}
            valueClass={rateColor(data.successRate)}
          />
          <MetricCard
            label="Rata-rata Latensi"
            value={formatLatency(data.avgLatencyMs)}
          />
          <MetricCard
            label="Perpindahan Server"
            value={`${data.failoverCount}`}
            suffix={`(${(data.failoverRate * 100).toFixed(1)}%)`}
          />
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  suffix,
  valueClass,
}: {
  label: string
  value: string
  suffix?: string
  valueClass?: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground font-mono block">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-lg font-mono font-bold ${valueClass ?? "text-foreground"}`}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
