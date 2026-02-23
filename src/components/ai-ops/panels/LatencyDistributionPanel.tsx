"use client"

interface LatencyDistributionData {
  p50: number
  p75: number
  p95: number
  p99: number
  max: number
  buckets: { label: string; count: number }[]
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}dtk`
}

export function LatencyDistributionPanel({
  data,
}: {
  data: LatencyDistributionData | undefined
}) {
  const maxCount = data
    ? Math.max(...data.buckets.map((b) => b.count), 1)
    : 1

  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Distribusi Latensi
        </span>
      </div>

      {!data ? (
        <div className="space-y-3">
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-8 rounded bg-muted animate-pulse" />
                <div className="h-5 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Percentile headlines */}
          <div className="flex gap-6 mb-5">
            <PercentileCard label="P50" value={formatMs(data.p50)} />
            <PercentileCard label="P95" value={formatMs(data.p95)} />
            <PercentileCard label="P99" value={formatMs(data.p99)} />
          </div>

          {/* Histogram */}
          <div className="space-y-2">
            {data.buckets.map((bucket) => {
              const pct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0
              return (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0 text-right">
                    {bucket.label}
                  </span>
                  <div className="flex-1 h-4 bg-muted/30 rounded-none overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-none transition-all duration-300"
                      style={{ width: `${Math.max(pct, bucket.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-foreground w-8 text-right">
                    {bucket.count}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PercentileCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block">
        {label}
      </span>
      <span className="text-sm font-mono font-bold text-foreground">
        {value}
      </span>
    </div>
  )
}
