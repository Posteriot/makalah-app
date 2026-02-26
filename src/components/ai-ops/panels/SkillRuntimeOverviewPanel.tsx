"use client"

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

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function formatReason(reason: string): string {
  if (reason === "unknown") return "Unknown"
  return reason.replace(/_/g, " ")
}

export function SkillRuntimeOverviewPanel({
  data,
}: {
  data: SkillRuntimeOverviewData | undefined
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Skill Runtime Overview
          </span>
        </div>

        {!data ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label="Total Requests" value={data.totalRequests.toLocaleString("id-ID")} />
            <Metric label="Skill Applied" value={data.skillAppliedCount.toLocaleString("id-ID")} />
            <Metric label="Fallback" value={data.fallbackCount.toLocaleString("id-ID")} />
            <Metric
              label="Fallback Rate"
              value={formatRate(data.fallbackRate)}
              valueClass={data.fallbackRate > 0.2 ? "text-amber-500" : "text-emerald-500"}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Top Fallback Reasons
            </span>
          </div>
          {!data ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 rounded-[8px] bg-muted animate-pulse" />
              ))}
            </div>
          ) : data.topFallbackReasons.length === 0 ? (
            <p className="text-[10px] font-mono text-muted-foreground">
              Tidak ada fallback pada periode ini.
            </p>
          ) : (
            <div className="space-y-2">
              {data.topFallbackReasons.map((item) => (
                <div
                  key={item.reason}
                  className="flex items-center justify-between rounded-[8px] border border-border px-3 py-2"
                >
                  <span className="text-[11px] font-mono text-foreground">
                    {formatReason(item.reason)}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-500">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90">
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Stage Breakdown
            </span>
          </div>
          {!data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded-[8px] bg-muted animate-pulse" />
              ))}
            </div>
          ) : data.byStage.length === 0 ? (
            <p className="text-[10px] font-mono text-muted-foreground">
              Belum ada data stage skill runtime.
            </p>
          ) : (
            <div className="max-h-[280px] space-y-1 overflow-auto pr-1">
              {data.byStage.map((stage) => (
                <div
                  key={stage.stage}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-[8px] border border-border px-3 py-2"
                >
                  <span className="truncate text-[11px] font-mono text-foreground">
                    {stage.stage}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {stage.requestCount}
                  </span>
                  <span className="text-[10px] font-mono text-amber-500">
                    {stage.fallbackCount}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatRate(stage.fallbackRate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-mono text-muted-foreground block">
        {label}
      </span>
      <span className={`text-lg font-mono font-bold ${valueClass ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

