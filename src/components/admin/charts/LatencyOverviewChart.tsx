"use client"

type LatencyOverviewChartProps = {
  avgLatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
  latencyTiers: { fast: number; medium: number; slow: number }
}

function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(1)
}

export function LatencyOverviewChart({
  avgLatencyMs,
  minLatencyMs,
  maxLatencyMs,
  latencyTiers,
}: LatencyOverviewChartProps) {
  const total = latencyTiers.fast + latencyTiers.medium + latencyTiers.slow
  const fastPct = total > 0 ? (latencyTiers.fast / total) * 100 : 0
  const mediumPct = total > 0 ? (latencyTiers.medium / total) * 100 : 0
  const slowPct = total > 0 ? (latencyTiers.slow / total) * 100 : 0

  const tiers = [
    {
      label: "Cepat",
      detail: "<1d",
      count: latencyTiers.fast,
      pct: fastPct,
      color: "bg-emerald-500",
    },
    {
      label: "Sedang",
      detail: "1-3d",
      count: latencyTiers.medium,
      pct: mediumPct,
      color: "bg-amber-500",
    },
    {
      label: "Lambat",
      detail: ">3d",
      count: latencyTiers.slow,
      pct: slowPct,
      color: "bg-rose-500",
    },
  ]

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold text-foreground">
          {msToSeconds(avgLatencyMs)}d
        </span>
        <span className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
          RATA-RATA LATENSI
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {tiers.map((tier) => (
          <div key={tier.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted-foreground">
                {tier.label}{" "}
                <span className="text-[10px] opacity-60">({tier.detail})</span>
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {tier.count}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${tier.color}`}
                style={{ width: `${Math.max(tier.pct, tier.count > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        tercepat: {msToSeconds(minLatencyMs)}d · terlambat: {msToSeconds(maxLatencyMs)}d
      </p>
    </div>
  )
}
